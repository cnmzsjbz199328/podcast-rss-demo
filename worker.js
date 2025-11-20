/**
 * Cloudflare Worker - RSS播客API
 * 重构后的精简版本
 */

import { Router } from './src/handlers/Router.js';
import { PodcastHandler } from './src/handlers/PodcastHandler.js';
import { ApiHandler } from './src/handlers/ApiHandler.js';
import { TestHandler } from './src/handlers/TestHandler.js';
import { CronHandler } from './src/handlers/CronHandler.js';
import { TopicApiHandler } from './src/handlers/TopicApiHandler.js';
import { serviceInitializer } from './src/services/ServiceInitializer.js';

// 创建处理器实例
const router = new Router();
const podcastHandler = new PodcastHandler();
const apiHandler = new ApiHandler();
const testHandler = new TestHandler();
const cronHandler = new CronHandler();
const topicApiHandler = new TopicApiHandler();

// 注册路由
// 新闻播客路由
router.register('POST', '/generate', (req, services) => podcastHandler.handleGenerate(req, services));
router.register('GET', '/episodes', (req, services) => apiHandler.handleEpisodes(req, services));
router.register('GET', '/episodes/*/poll-audio', (req, services, params) => apiHandler.handlePollAudio(req, services, params));
router.register('GET', '/episodes/*', (req, services, params) => apiHandler.handleEpisodeDetail(req, services, params));

// 主题播客路由（更具体的路由放在前面）
router.register('POST', '/topics/*/generate', (req, services, params) => topicApiHandler.handleGenerateTopicPodcast(req, services, params));
router.register('GET', '/topics/*/podcasts', (req, services, params) => topicApiHandler.handleGetTopicPodcasts(req, services, params));
router.register('GET', '/topics/podcasts/*/poll-audio', (req, services, params) => topicApiHandler.handlePollTopicPodcast(req, services, params));

// 主题管理路由
router.register('POST', '/topics', (req, services) => topicApiHandler.handleCreateTopic(req, services));
router.register('GET', '/topics', (req, services) => topicApiHandler.handleGetTopics(req, services));
router.register('GET', '/topics/*', (req, services, params) => topicApiHandler.handleGetTopic(req, services, params));
router.register('PUT', '/topics/*', (req, services, params) => topicApiHandler.handleUpdateTopic(req, services, params));
router.register('DELETE', '/topics/*', (req, services, params) => topicApiHandler.handleDeleteTopic(req, services, params));

// 其他路由
router.register('GET', '/rss.xml', (req, services) => apiHandler.handleRssFeed(req, services));
router.register('GET', '/health', (req, services) => apiHandler.handleHealth(req, services));
router.register('GET', '/stats', (req, services) => apiHandler.handleSystemStats(req, services));
router.register('GET', '/info', (req, services) => apiHandler.handleApiInfo(req, services));
router.register('GET', '/opml.xml', (req, services) => apiHandler.handleOpmlExport(req, services));

// 测试路由 - 用于调试 IndexTTS 集成（同步等待音频生成）
router.register('POST', '/test/tts', (req, services) => testHandler.handleTestTts(req, services));

// 调试路由 - 检查环境变量（仅开发环境）
router.register('GET', '/debug/env', (req, env) => {
  // 仅在开发环境允许调试路由
  if (env.NODE_ENV !== 'development') {
    return new Response(JSON.stringify({ error: 'Debug routes only available in development' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const geminiValue = env.GEMINI_API_KEY;
  const hasGeminiKey = !!geminiValue && geminiValue.trim() !== '';

  return new Response(JSON.stringify({
    environment: {
      GEMINI_API_KEY: hasGeminiKey ? `***${geminiValue.length}chars***` : 'NOT_SET',
      NODE_ENV: env.NODE_ENV,
      BBC_RSS_URL: env.BBC_RSS_URL
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
router.register('GET', '/test/rss', (req, services) => testHandler.handleTestRss(req, services));
router.register('POST', '/test/script', (req, services) => testHandler.handleTestScript(req, services));

// 默认API文档路由
router.register('GET', '/', (req, services) => {
  const baseUrl = new URL(req.url).origin;

  return new Response(JSON.stringify({
    name: 'Podcast RSS API',
    version: '2.0.0',
    description: '由AI生成的播客服务，支持新闻播客和主题播客',
    newsPodcast: {
      description: '基于BBC RSS的新闻播客生成',
      endpoints: {
        'POST /generate': {
          description: '生成新闻播客',
          parameters: { style: 'news-anchor (默认)', useAsyncTts: 'true/false' },
          example: `${baseUrl}/generate?style=news-anchor&useAsyncTts=false`
        },
        'GET /episodes': {
          description: '获取新闻播客列表',
          parameters: { limit: '每页数量 (默认20)', offset: '偏移量 (默认0)' },
          example: `${baseUrl}/episodes?limit=10&offset=0`
        },
        'GET /episodes/:id': {
          description: '获取新闻播客详情',
          example: `${baseUrl}/episodes/123`
        },
        'GET /episodes/:id/poll-audio': {
          description: '轮询异步生成的音频状态',
          example: `${baseUrl}/episodes/123/poll-audio`
        }
      }
    },
    topicPodcast: {
      description: '基于主题的播客生成',
      endpoints: {
        'POST /topics': {
          description: '创建新主题',
          body: { title: '主题标题', description: '描述', keywords: '关键词', category: '分类' },
          example: `${baseUrl}/topics`
        },
        'GET /topics': {
          description: '获取主题列表',
          parameters: { status: '状态过滤', category: '分类过滤', limit: '数量', offset: '偏移量' },
          example: `${baseUrl}/topics?status=active&limit=10`
        },
        'GET /topics/:id': {
          description: '获取主题详情和统计',
          example: `${baseUrl}/topics/1`
        },
        'POST /topics/:id/generate': {
          description: '生成主题播客',
          parameters: { style: 'topic-explainer (默认)', useAsyncTts: 'true/false' },
          example: `${baseUrl}/topics/1/generate?style=topic-explainer`
        },
        'GET /topics/:id/podcasts': {
          description: '获取主题的播客列表',
          example: `${baseUrl}/topics/1/podcasts`
        },
        'GET /topics/podcasts/:episodeId/poll-audio': {
          description: '轮询主题播客生成状态',
          example: `${baseUrl}/topics/podcasts/episode-123/poll-audio`
        }
      }
    },
    common: {
      'GET /rss.xml': {
        description: '获取RSS Feed',
        example: `${baseUrl}/rss.xml`
      },
      'GET /health': {
        description: '健康检查',
        example: `${baseUrl}/health`
      },
      'GET /stats': {
        description: '系统统计信息',
        example: `${baseUrl}/stats`
      }
    },
    styles: {
      news: ['news-anchor - 新闻主播风格'],
      topic: ['topic-explainer - 主题讲解风格']
    }
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
},

   /**
    * Cron Trigger 处理
    * 定时调度播客生成
    */
   async scheduled(event, env, ctx) {
     try {
       // 使用 waitUntil 确保异步任务完成
       ctx.waitUntil(
         cronHandler.handleScheduled(event, env, ctx)
       );
     } catch (error) {
       console.error('Scheduled event failed:', error);
     }
   }
 };
