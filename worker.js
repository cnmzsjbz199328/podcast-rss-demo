import { PodcastGenerator } from './src/core/PodcastGenerator.js';
import { BbcRssService } from './src/implementations/BbcRssService.js';
import { GeminiScriptService } from './src/implementations/GeminiScriptService.js';
import { IndexTtsVoiceServiceHttp } from './src/implementations/IndexTtsVoiceServiceHttp.js';
import { R2StorageServiceWorker } from './src/implementations/R2StorageServiceWorker.js';
import { D1DatabaseService } from './src/implementations/D1DatabaseService.js';
import { Logger } from './src/utils/logger.js';

const logger = new Logger('Worker');

// 全局服务实例（懒加载）
let services = null;
let generator = null;
let dbService = null;

/**
 * 获取或创建服务实例
 * @param {Object} env - 环境变量
 * @returns {Object} 服务实例
 */
async function getServices(env) {
  if (!services) {
    logger.info('Initializing services with R2 and D1 bindings');

    // 使用 Worker 绑定直接创建服务
    const rssService = new BbcRssService({
      url: env.BBC_RSS_URL || 'https://feeds.bbci.co.uk/news/rss.xml'
    });

    const scriptService = new GeminiScriptService({
      apiKey: env.GEMINI_API_KEY
    });

    const voiceService = new IndexTtsVoiceServiceHttp({
      endpoint: 'Tom1986/indextts2'
    });

    // 使用 R2 绑定
    const storageService = new R2StorageServiceWorker(env.PODCAST_BUCKET, env.R2_BASE_URL);

    // 使用 D1 绑定
    dbService = new D1DatabaseService(env.DB);

    services = {
      rssService: rssService,
      scriptService: scriptService,
      voiceService: voiceService,
      storageService: storageService,
      database: dbService
    };

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
          provider: 'r2-worker',
          baseUrl: env.R2_BASE_URL
        }
      }
    };

    generator = new PodcastGenerator(services, config);

    logger.info('Services initialized successfully with R2 and D1');
  }

  return services;
}

/**
 * 生成RSS XML
 * @param {Object} services - 服务实例
 * @param {string} baseUrl - 基础URL
 * @returns {Promise<Response>} RSS响应
 */
async function generateRssXml(services, baseUrl) {
  try {
    logger.info('Generating RSS XML from D1 database');

    // 从 D1 数据库获取最近发布的剧集
    const episodes = await services.database.getPublishedEpisodes(50);
    
    if (!episodes || episodes.length === 0) {
      logger.warn('No published episodes found in database');
    }

    // 构建 RSS XML
    const items = episodes.map(episode => {
      const pubDate = new Date(episode.published_at || episode.created_at).toUTCString();
      const duration = episode.duration || 0;
      
      return `    <item>
      <title>${escapeXml(episode.title)}</title>
      <description>${escapeXml(episode.description || '')}</description>
      <enclosure url="${escapeXml(episode.audio_url)}" type="audio/mpeg" length="${episode.file_size || 0}"/>
      <guid isPermaLink="true">${escapeXml(episode.audio_url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <itunes:duration>${Math.floor(duration)}</itunes:duration>
      <itunes:subtitle>${escapeXml(episode.style || 'news-anchor')}</itunes:subtitle>
    </item>`;
    }).join('\n');

    const stats = await services.database.getStatistics();
    const lastBuildDate = episodes.length > 0 
      ? new Date(episodes[0].published_at || episodes[0].created_at).toUTCString()
      : new Date().toUTCString();

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI新闻播客</title>
    <description>由AI生成的每日新闻播客，包含郭德纲风格、新闻主播风格等多种播报形式</description>
    <link>${baseUrl}</link>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>zh-cn</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <itunes:author>AI播客生成器</itunes:author>
    <itunes:summary>每日AI新闻播客，多种风格播报新闻</itunes:summary>
    <itunes:category text="News"/>
    <itunes:explicit>no</itunes:explicit>
    <itunes:image href="${baseUrl}/cover.jpg"/>
${items}
  </channel>
</rss>`;

    logger.info('RSS XML generated successfully', { 
      episodeCount: episodes.length,
      totalEpisodes: stats.totalEpisodes 
    });

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
 * 转义 XML 特殊字符
 * @param {string} str - 输入字符串
 * @returns {string} 转义后的字符串
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

    // 生成播客
    const result = await generator.generatePodcast(style);

    logger.info('Podcast generation result received', { 
      episodeId: result.episodeId,
      hasAudioUrl: !!result.audioUrl,
      hasEventId: !!result.eventId,
      isAsync: result.isAsync,
      hasScriptUrl: !!result.scriptUrl
    });

    // 保存到 D1 数据库
    if (result.episodeId) {
      try {
        logger.info('Preparing to save episode to database', { 
          episodeId: result.episodeId,
          audioUrl: result.audioUrl,
          eventId: result.eventId,
          isAsync: result.isAsync
        });

        const episodeData = {
          id: result.episodeId,
          title: result.title || `${style} - ${new Date().toLocaleDateString('zh-CN')}`,
          description: result.description || '由AI生成的新闻播客',
          audioUrl: result.audioUrl || null, // 异步时可能为空
          audioKey: result.audioUrl ? result.audioUrl.split('/').pop() : null,
          scriptUrl: result.scriptUrl,
          scriptKey: result.scriptUrl ? result.scriptUrl.split('/').pop() : null,
          duration: result.duration || 0,
          fileSize: result.fileSize || 0,
          style: style,
          transcript: result.metadata?.scriptMetadata?.script || '',
          status: 'published', // 自动发布
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          ttsEventId: result.eventId || null, // 保存event_id
          ttsStatus: result.isAsync ? 'pending' : 'completed', // 异步时状态为pending
          metadata: {
            newsCount: result.newsCount || 0,
            wordCount: result.wordCount || 0,
            generatedAt: result.generatedAt || new Date().toISOString(),
            scriptMetadata: result.metadata?.scriptMetadata || {},
            voiceMetadata: result.metadata?.voiceMetadata || {},
            storageMetadata: result.metadata?.storageMetadata || {}
          }
        };

        logger.info('Episode data prepared', { id: episodeData.id, title: episodeData.title });
        
        const saved = await services.database.saveEpisode(episodeData);
        
        if (saved) {
          logger.info('✅ Episode saved to database successfully', { episodeId: episodeData.id });
        } else {
          logger.error('❌ Episode save returned false', { episodeId: episodeData.id });
        }
      } catch (dbError) {
        logger.error('❌ Failed to save episode to database', { 
          error: dbError.message, 
          stack: dbError.stack,
          episodeId: result.episodeId 
        });
        // 不中断流程，播客已经生成成功
      }
    } else {
      logger.warn('Skipping database save - missing episode ID', {
        hasEpisodeId: !!result.episodeId
      });
    }

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
 * 处理剧集列表请求
 * @param {Request} request - 请求对象
 * @param {Object} services - 服务实例
 * @returns {Promise<Response>} 响应
 */
async function handleEpisodesRequest(request, services) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const style = url.searchParams.get('style');

    logger.info('Fetching episodes', { limit, offset, style });

    let episodes;
    if (style) {
      episodes = await services.database.getEpisodesByStyle(style, limit, offset);
    } else {
      episodes = await services.database.getPublishedEpisodes(limit, offset);
    }

    const stats = await services.database.getStatistics();

    return new Response(JSON.stringify({
      success: true,
      data: {
        episodes: episodes.map(ep => ({
          id: ep.id,
          title: ep.title,
          description: ep.description,
          audioUrl: ep.audioUrl,
          style: ep.style,
          duration: ep.duration,
          fileSize: ep.fileSize,
          publishedAt: ep.publishedAt,
          createdAt: ep.createdAt
        })),
        pagination: {
          limit,
          offset,
          total: stats.totalEpisodes
        },
        stats
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=60'
      }
    });

  } catch (error) {
    logger.error('Failed to fetch episodes', error);

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
 * 处理单个剧集请求
 * @param {Request} request - 请求对象
 * @param {Object} services - 服务实例
 * @param {string} episodeId - 剧集ID
 * @returns {Promise<Response>} 响应
 */
async function handleEpisodeDetailRequest(request, services, episodeId) {
  try {
    logger.info('Fetching episode detail', { episodeId });

    const episode = await services.database.getEpisodeById(episodeId);

    if (!episode) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Episode not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    logger.info('Episode found', { 
      id: episode.id, 
      title: episode.title,
      hasMetadata: !!episode.metadata 
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: episode.id,
        title: episode.title,
        description: episode.description,
        audioUrl: episode.audioUrl,
        scriptUrl: episode.scriptUrl || (episode.audioUrl ? episode.audioUrl.replace('/audio/', '/scripts/').replace('.wav', '.txt') : null),
        style: episode.style,
        duration: episode.duration,
        fileSize: episode.fileSize,
        transcript: episode.transcript,
        metadata: episode.metadata, // 已经是对象，不需要 JSON.parse
        publishedAt: episode.publishedAt,
        createdAt: episode.createdAt,
        ttsEventId: episode.ttsEventId, // 添加TTS字段
        ttsStatus: episode.ttsStatus,
        ttsError: episode.ttsError
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=3600'
      }
    });

  } catch (error) {
    logger.error('Failed to fetch episode detail', { 
      error: error.message,
      stack: error.stack 
    });

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
 * 处理音频轮询请求
 * @param {Request} request - 请求对象
 * @param {Object} services - 服务实例
 * @param {string} episodeId - 剧集ID
 * @returns {Promise<Response>} 响应
 */
async function handlePollAudioRequest(request, services, episodeId) {
  try {
    logger.info('Polling audio for episode', { episodeId });

    // 获取剧集信息
    const episode = await services.database.getEpisodeById(episodeId);
    
    if (!episode) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Episode not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查是否有event_id
    if (!episode.ttsEventId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No TTS event ID found for this episode'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 如果已经完成，直接返回
    if (episode.ttsStatus === 'completed') {
      return new Response(JSON.stringify({
        success: true,
        status: 'completed',
        audioUrl: episode.audioUrl
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 轮询IndexTTS获取结果
    logger.info('Polling IndexTTS for event_id', { eventId: episode.ttsEventId });
    
    const pollResult = await services.voiceService.pollAudioResult(episode.ttsEventId);

    if (pollResult.status === 'completed') {
      // 上传音频到R2
      const audioKey = `audio/${new Date().toISOString().split('T')[0]}-${episode.style}-${Math.random().toString(36).substring(7)}.wav`;
      const uploadResult = await services.storageService.uploadFile(
        audioKey,
        pollResult.audioData,
        'audio/wav'
      );

      const audioUrl = `${services.storageService.baseUrl}/${audioKey}`;

      // 更新数据库
      await services.database.updateEpisodeAudio(episodeId, {
        audioUrl: audioUrl,
        audioKey: audioKey,
        fileSize: pollResult.fileSize,
        duration: episode.duration, // 保持原估算时长
        ttsStatus: 'completed'
      });

      logger.info('Audio polling completed and saved', { 
        episodeId, 
        audioUrl,
        fileSize: pollResult.fileSize 
      });

      return new Response(JSON.stringify({
        success: true,
        status: 'completed',
        audioUrl: audioUrl,
        fileSize: pollResult.fileSize
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (pollResult.status === 'failed') {
      // 更新失败状态
      await services.database.updateTtsStatus(episodeId, 'failed', pollResult.error);

      return new Response(JSON.stringify({
        success: false,
        status: 'failed',
        error: pollResult.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      // 仍在处理中
      return new Response(JSON.stringify({
        success: true,
        status: 'processing',
        message: 'Audio generation still in progress'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    logger.error('Failed to poll audio', { episodeId, error: error.message });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 处理健康检查请求
 * @param {Object} services - 服务实例
 * @returns {Promise<Response>} 健康状态响应
 */
async function handleHealthCheck(services) {
  try {
    // 检查服务状态
    const checks = {
      database: false,
      storage: false,
      timestamp: new Date().toISOString()
    };

    // 检查 D1 数据库
    try {
      const stats = await services.database.getStatistics();
      checks.database = true;
      checks.databaseStats = stats;
    } catch (error) {
      logger.error('Database health check failed', error);
      checks.databaseError = error.message;
    }

    // 检查 R2 存储
    try {
      const storageStats = await services.storageService.getStatistics();
      checks.storage = true;
      checks.storageStats = storageStats;
    } catch (error) {
      logger.error('Storage health check failed', error);
      checks.storageError = error.message;
    }

    const isHealthy = checks.database && checks.storage;

    return new Response(JSON.stringify({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: checks.timestamp,
      services: checks
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
      const baseUrl = `${url.protocol}//${url.host}`;

      // CORS预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }

      // 路由处理
      if (url.pathname === '/rss.xml' && request.method === 'GET') {
        return await generateRssXml(services, baseUrl);
      }

      if (url.pathname === '/generate' && request.method === 'POST') {
        return await handleGenerateRequest(request, services);
      }

      if (url.pathname === '/episodes' && request.method === 'GET') {
        return await handleEpisodesRequest(request, services);
      }

      // 匹配 /episodes/:id 路由
      const episodeMatch = url.pathname.match(/^\/episodes\/([a-zA-Z0-9-]+)$/);
      if (episodeMatch && request.method === 'GET') {
        return await handleEpisodeDetailRequest(request, services, episodeMatch[1]);
      }

      // 匹配 /episodes/:id/poll-audio 路由
      const pollMatch = url.pathname.match(/^\/episodes\/([a-zA-Z0-9-]+)\/poll-audio$/);
      if (pollMatch && request.method === 'POST') {
        return await handlePollAudioRequest(request, services, pollMatch[1]);
      }

      if (url.pathname === '/health' && request.method === 'GET') {
        return await handleHealthCheck(services);
      }

      // 默认响应 - API文档
      return new Response(JSON.stringify({
        name: 'Podcast RSS API',
        version: '2.0.0',
        description: '由AI生成的新闻播客服务，支持多种播报风格',
        endpoints: {
          'GET /rss.xml': {
            description: '获取RSS Feed',
            example: `${baseUrl}/rss.xml`
          },
          'POST /generate': {
            description: '生成播客',
            parameters: {
              style: 'guo-de-gang | news-anchor | emotional'
            },
            example: `${baseUrl}/generate?style=news-anchor`
          },
          'GET /episodes': {
            description: '获取剧集列表',
            parameters: {
              limit: '每页数量 (默认20)',
              offset: '偏移量 (默认0)',
              style: '风格过滤 (可选)'
            },
            example: `${baseUrl}/episodes?limit=10&offset=0&style=news-anchor`
          },
          'GET /episodes/:id': {
            description: '获取剧集详情',
            example: `${baseUrl}/episodes/123`
          },
          'GET /health': {
            description: '健康检查',
            example: `${baseUrl}/health`
          }
        },
        styles: [
          'guo-de-gang - 郭德纲风格',
          'news-anchor - 新闻主播风格',
          'emotional - 情感化风格'
        ]
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
