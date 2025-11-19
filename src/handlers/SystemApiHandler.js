/**
 * 系统API处理器 - 处理健康检查等系统API请求
 */

import { Logger } from '../utils/logger.js';

export class SystemApiHandler {
  constructor() {
    this.logger = new Logger('SystemApiHandler');
  }

  /**
   * 处理健康检查请求
   */
  async handleHealth(request, services) {
    try {
      this.logger.info('Health check requested');

      const stats = await services.database.getStatistics();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: stats ? 'healthy' : 'unhealthy',
          storage: 'healthy', // Assume healthy if we can serve this response
          totalEpisodes: stats.totalEpisodes || 0,
          publishedEpisodes: stats.publishedEpisodes || 0
        }
      };

      const isHealthy = Object.values(health.services).every(s =>
        typeof s === 'string' ? s === 'healthy' : true
      );

      return new Response(JSON.stringify(health), {
        status: isHealthy ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

    } catch (error) {
      this.logger.error('Health check failed', error);
      return new Response(JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 处理系统统计信息
   */
  async handleSystemStats(request, services) {
    try {
      this.logger.info('System stats requested');

      const stats = await services.database.getStatistics();
      const ttsStats = await services.database.getTtsStatistics();
      const recentStats = await services.database.getRecentStatistics(7);

      const systemStats = {
        timestamp: new Date().toISOString(),
        episodes: stats,
        tts: ttsStats,
        recent: recentStats,
        services: {
          database: stats ? 'healthy' : 'unhealthy',
          storage: 'healthy',
          rss: 'healthy',
          ai: 'healthy',
          voice: 'healthy'
        }
      };

      return new Response(JSON.stringify({
        success: true,
        data: systemStats
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=60'
        }
      });

    } catch (error) {
      this.logger.error('System stats failed', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get system stats'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 处理API信息请求
   */
  async handleApiInfo(request, services) {
    try {
      const baseUrl = new URL(request.url).origin;

      const apiInfo = {
        name: 'Podcast RSS API',
        version: '2.0.0',
        description: '由AI生成的NewsPodcast服务，支持多种播报风格',
        endpoints: {
          'POST /generate': {
            description: '生成Podcast',
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
          },
          'GET /stats': {
            description: '系统统计',
            example: `${baseUrl}/stats`
          }
        },
        styles: ['guo-de-gang - 郭德纲风格', 'news-anchor - News主播风格', 'emotional - 情感化风格']
      };

      return new Response(JSON.stringify(apiInfo), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      this.logger.error('API info failed', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get API info'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}
