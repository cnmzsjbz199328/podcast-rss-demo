/**
 * Cloudflare Worker - RSS播客API
 * 重构后的精简版本
 */

import { Router } from './src/handlers/Router.js';
import { PodcastHandler } from './src/handlers/PodcastHandler.js';
import { ApiHandler } from './src/handlers/ApiHandler.js';
import { serviceInitializer } from './src/services/ServiceInitializer.js';

// 创建处理器实例
const router = new Router();
const podcastHandler = new PodcastHandler();
const apiHandler = new ApiHandler();

// 注册路由
router.register('POST', '/generate', (req, services) => podcastHandler.handleGenerate(req, services));
router.register('GET', '/episodes', (req, services) => apiHandler.handleEpisodes(req, services));
router.register('GET', '/episodes/*', (req, services, params) => apiHandler.handleEpisodeDetail(req, services, params));
router.register('POST', '/episodes/*/poll-audio', (req, services, params) => apiHandler.handlePollAudio(req, services, params));
router.register('GET', '/rss.xml', (req, services) => apiHandler.handleRssFeed(req, services));
router.register('GET', '/health', (req, services) => apiHandler.handleHealth(req, services));
router.register('GET', '/stats', (req, services) => apiHandler.handleSystemStats(req, services));
router.register('GET', '/info', (req, services) => apiHandler.handleApiInfo(req, services));
router.register('GET', '/opml.xml', (req, services) => apiHandler.handleOpmlExport(req, services));

// 默认API文档路由
router.register('GET', '/', (req, services) => {
  const baseUrl = new URL(req.url).origin;

  return new Response(JSON.stringify({
    name: 'Podcast RSS API',
    version: '2.0.0',
    description: '由AI生成的新闻播客服务，支持多种播报风格',
    endpoints: {
      'POST /generate': {
        description: '生成播客',
        parameters: { style: 'guo-de-gang | news-anchor | emotional' },
        example: `${baseUrl}/generate?style=news-anchor`
      },
      'GET /episodes': {
        description: '获取剧集列表',
        parameters: { limit: '每页数量 (默认20)', offset: '偏移量 (默认0)', style: '风格过滤 (可选)' },
        example: `${baseUrl}/episodes?limit=10&offset=0&style=news-anchor`
      },
      'GET /episodes/:id': {
        description: '获取剧集详情',
        example: `${baseUrl}/episodes/123`
      },
      'GET /rss.xml': {
        description: '获取RSS Feed',
        example: `${baseUrl}/rss.xml`
      },
      'GET /health': {
        description: '健康检查',
        example: `${baseUrl}/health`
      }
    },
    styles: ['guo-de-gang - 郭德纲风格', 'news-anchor - 新闻主播风格', 'emotional - 情感化风格']
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
});

/**
 * 主请求处理函数
 */
export default {
  async fetch(request, env, ctx) {
    try {
      // 初始化服务
      const services = serviceInitializer.getServices(env);

      // 处理CORS预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }

      // 使用路由器处理请求
      return await router.handle(request, services);

    } catch (error) {
      console.error('Worker request failed:', error);

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
  }
};
