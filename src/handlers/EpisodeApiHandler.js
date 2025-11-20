/**
 * 剧集API处理器 - 处理剧集相关的API请求
 */

import { Logger } from '../utils/logger.js';

export class EpisodeApiHandler {
  constructor() {
    this.logger = new Logger('EpisodeApiHandler');
  }

  /**
   * 处理剧集列表请求
   */
  async handleEpisodes(request, services) {
    try {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const style = url.searchParams.get('style');

      this.logger.info('Fetching episodes via NewsPodcastService', { limit, offset, style });

      // 使用新的业务服务
      const podcastService = services.newsPodcastService;

      const filters = { style, limit, offset };
      const result = await podcastService.getPodcasts(filters);
      const episodes = result;

      // 获取统计信息（这里简化处理，未来可以从服务获取）
      const stats = await services.database.getStatistics();

      const response = {
        success: true,
        data: {
          episodes: episodes.map(ep => ({
            id: ep.episodeId,
            title: ep.title || `Episode ${ep.episodeId}`,
            description: ep.description,
            audioUrl: ep.audioUrl,
            style: 'news-anchor', // 默认风格
            duration: ep.duration,
            fileSize: 0, // 暂时使用默认值
            publishedAt: ep.publishedAt || ep.createdAt,
            createdAt: ep.createdAt
          })),
          pagination: {
            limit,
            offset,
            total: stats.totalEpisodes || 0
          },
          stats
        }
      };

      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      this.logger.error('Episodes fetch failed', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch episodes'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 处理单个剧集详情请求
   */
  async handleEpisodeDetail(request, services, params) {
    try {
      const episodeId = params[0];

      if (!episodeId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Episode ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      this.logger.info('Fetching episode detail via NewsPodcastService', { episodeId });

      // 使用新的业务服务
      const podcastService = services.newsPodcastService;
      const episode = await podcastService.getPodcastById(episodeId);

      if (!episode) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Episode not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          id: episode.episodeId,
          title: episode.title,
          description: episode.description,
          audioUrl: episode.audioUrl,
          style: 'news-anchor', // 默认风格
          duration: episode.duration,
          fileSize: 0, // 暂时使用默认值
          publishedAt: episode.publishedAt,
          createdAt: episode.createdAt,
          ttsEventId: episode.ttsEventId,
          ttsError: episode.ttsError || episode.tts_error
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      this.logger.error('Episode detail fetch failed', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch episode detail'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 处理音频轮询请求
   */
  async handlePollAudio(request, services, params) {
    try {
      const episodeId = params[0];

      if (!episodeId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Episode ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      this.logger.info('Polling audio for episode via NewsPodcastService', { episodeId });

      // 使用新的业务服务进行轮询
      const podcastService = services.newsPodcastService;

      try {
        const pollResult = await podcastService.pollGeneration(episodeId);

      // 根据轮询结果返回相应的响应
      if (pollResult.status === 'completed') {
        return new Response(JSON.stringify({
        success: true,
        status: 'completed',
          audioUrl: pollResult.podcast?.audioUrl
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } else if (pollResult.status === 'failed') {
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
        message: 'Audio generation in progress'
      }), {
          headers: { 'Content-Type': 'application/json' }
      });
      }

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

    } catch (error) {
      this.logger.error('Audio polling failed', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Audio polling failed: ' + error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}
