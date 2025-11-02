/**
 * Cloudflare Worker - RSS生成和播客API
 */

import { PodcastGenerator } from './src/core/PodcastGenerator.js';
import { createServices } from './src/factory.js';
import { Logger } from './src/utils/logger.js';

const logger = new Logger('Worker');

// 全局服务实例（懒加载）
let services = null;
let generator = null;

/**
 * 获取或创建服务实例
 * @param {Object} env - 环境变量
 * @returns {Object} 服务实例
 */
async function getServices(env) {
  if (!services) {
    logger.info('Initializing services');

    // 从环境变量构建配置
    const config = {
      services: {
        rss: {
          url: env.BBC_RSS_URL || 'https://feeds.bbci.co.uk/news/rss.xml'
        },
        script: {
          apiKey: env.GEMINI_API_KEY,
          provider: 'gemini'
        },
        voice: {
          provider: 'indextts',
          endpoint: 'Tom1986/indextts2'
        },
        storage: {
          provider: 'r2',
          bucket: env.R2_BUCKET_NAME,
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          baseUrl: env.R2_BASE_URL,
          accountId: env.CLOUDFLARE_ACCOUNT_ID
        }
      }
    };

    services = createServices(config);
    generator = new PodcastGenerator(services, config);

    logger.info('Services initialized successfully');
  }

  return services;
}

/**
 * 生成RSS XML
 * @param {Object} services - 服务实例
 * @returns {Promise<Response>} RSS响应
 */
async function generateRssXml(services) {
  try {
    logger.info('Generating RSS XML');

    // 这里应该从存储服务获取最近的剧集
    // 暂时返回示例RSS
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>AI新闻播客</title>
    <description>由AI生成的每日新闻播客</description>
    <link>https://your-domain.com</link>
    <language>zh-cn</language>
    <itunes:author>AI播客生成器</itunes:author>
    <itunes:image href="https://your-r2-bucket.r2.cloudflarestorage.com/podcast-cover.jpg"/>
    <item>
      <title>郭德纲说新闻 - ${new Date().toLocaleDateString('zh-CN')}</title>
      <description>郭德纲风格的今日新闻播报</description>
      <enclosure url="https://your-r2-bucket.r2.cloudflarestorage.com/audio/example.mp3" type="audio/mpeg" length="123456"/>
      <guid>https://your-r2-bucket.r2.cloudflarestorage.com/audio/example.mp3</guid>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <itunes:duration>300</itunes:duration>
    </item>
  </channel>
</rss>`;

    return new Response(rssXml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'max-age=300' // 缓存5分钟
      }
    });

  } catch (error) {
    logger.error('Failed to generate RSS XML', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * 处理播客生成请求
 * @param {Request} request - 请求对象
 * @param {Object} services - 服务实例
 * @returns {Promise<Response>} 响应
 */
async function handleGenerateRequest(request, services) {
  try {
    const url = new URL(request.url);
    const style = url.searchParams.get('style') || 'news-anchor';

    logger.info('Generating podcast', { style });

    const result = await generator.generatePodcast(style);

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    logger.error('Podcast generation failed', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * 处理健康检查
 * @param {Object} services - 服务实例
 * @returns {Promise<Response>} 健康状态响应
 */
async function handleHealthCheck(services) {
  try {
    const { getServicesStatus } = await import('./src/factory.js');
    const status = await getServicesStatus(services);

    const isHealthy = Object.values(status).every(s => s.status === 'healthy');

    return new Response(JSON.stringify({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: status
    }), {
      status: isHealthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    logger.error('Health check failed', error);

    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * 主请求处理函数
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @param {Object} ctx - 上下文
 * @returns {Promise<Response>} 响应
 */
export default {
  async fetch(request, env, ctx) {
    try {
      const services = await getServices(env);
      const url = new URL(request.url);

      // CORS预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }

      // 路由处理
      if (url.pathname === '/rss.xml' && request.method === 'GET') {
        return await generateRssXml(services);
      }

      if (url.pathname === '/generate' && request.method === 'POST') {
        return await handleGenerateRequest(request, services);
      }

      if (url.pathname === '/health' && request.method === 'GET') {
        return await handleHealthCheck(services);
      }

      // 默认响应
      return new Response(JSON.stringify({
        message: 'Podcast RSS API',
        endpoints: {
          'GET /rss.xml': '获取RSS Feed',
          'POST /generate': '生成播客',
          'GET /health': '健康检查'
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      logger.error('Worker request failed', error);

      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  },

  /**
   * 定时任务：每日生成播客
   */
  async scheduled(event, env, ctx) {
    try {
      logger.info('Running scheduled podcast generation');

      const services = await getServices(env);
      const generator = new PodcastGenerator(services);

      // 并发生成两种风格的播客
      const results = await Promise.allSettled([
        generator.generatePodcast('guo-de-gang'),
        generator.generatePodcast('news-anchor')
      ]);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info('Scheduled generation completed', {
        successful,
        failed,
        total: results.length
      });

      // 记录失败的生成
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(`Scheduled generation failed for style ${index}`, result.reason);
        }
      });

    } catch (error) {
      logger.error('Scheduled task failed', error);
    }
  }
};
