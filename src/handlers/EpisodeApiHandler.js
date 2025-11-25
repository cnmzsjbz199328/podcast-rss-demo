/**
 * 剧集API处理器 - 处理剧集相关的API请求
 */

import { Logger } from '../utils/logger.js';
import { jsonResponse as corsJsonResponse } from '../utils/http.js';

export class EpisodeApiHandler {
  constructor() {
    this.logger = new Logger('EpisodeApiHandler');
  }

  jsonResponse(body, status = 200) {
    return corsJsonResponse(body, status);
  }

  /**
  * 处理剧集列表请求 - 同时获取news episodes和topic podcasts
  */
  async handleEpisodes(request, services) {
  try {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const style = url.searchParams.get('style');

  this.logger.info('Fetching episodes from both news and topic sources', { limit, offset, style });

  // 获取news episodes（只有当没有style过滤或style为news-anchor时）
  let newsEpisodes = [];
  if (!style || style === 'news-anchor') {
  const rawNewsEpisodes = await services.newsPodcastService.getPodcasts({ style, limit, offset });
  newsEpisodes = rawNewsEpisodes.map(ep => ({
      ...ep,
      style: 'news-anchor' // News episodes use news-anchor style
    }));
  }

  // 获取topic podcasts（如果没有style过滤或style为topic-explainer时）
  let topicEpisodes = [];
  if (!style || style === 'topic-explainer') {
        try {
          const topicFilters = { limit, offset, status: 'completed' };
          const topicResult = await services.topicPodcastRepository.getAll(topicFilters);
          topicEpisodes = topicResult.map(tp => ({
            episodeId: tp.episode_id, // 数据库字段是episode_id
            title: tp.title || `Topic Episode ${tp.episodeNumber}`,
            description: tp.abstract || tp.title,
            audioUrl: tp.audio_url, // 数据库字段是audio_url
            style: 'topic-explainer', // Topic episodes use topic-explainer style
            duration: tp.duration || 0,
            publishedAt: tp.updated_at || tp.created_at, // 数据库字段是updated_at/created_at
            createdAt: tp.created_at,
            topicId: tp.topic_id, // 数据库字段是topic_id
            episodeNumber: tp.episode_number
          }));
        } catch (error) {
          this.logger.warn('Failed to fetch topic episodes', error);
          // 继续处理，不影响news episodes
        }
      }

      // 合并并排序所有episodes（按创建时间倒序），去重
      const episodeMap = new Map();

      // 先添加news episodes
      newsEpisodes.forEach(ep => {
        episodeMap.set(ep.episodeId, ep);
      });

      // 再添加topic episodes（如果不存在或需要更新）
      topicEpisodes.forEach(ep => {
        if (!episodeMap.has(ep.episodeId)) {
          episodeMap.set(ep.episodeId, ep);
        } else {
          // 如果已存在，优先使用topic episodes的style
          const existing = episodeMap.get(ep.episodeId);
          if (existing.style !== 'topic-explainer' && ep.style === 'topic-explainer') {
            episodeMap.set(ep.episodeId, ep);
          }
        }
      });

      const allEpisodes = Array.from(episodeMap.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(offset, offset + limit);

      const episodes = allEpisodes;

      // 获取统计信息（合并news和topic的统计）
      const newsStats = await services.database.getStatistics();
      const topicStats = await services.topicPodcastRepository.getGlobalStatistics();

      const stats = {
        totalEpisodes: (newsStats.totalEpisodes || 0) + (topicStats.totalPodcasts || 0),
        publishedEpisodes: (newsStats.publishedEpisodes || 0) + (topicStats.completedPodcasts || 0),
        totalDuration: (newsStats.totalDuration || 0) + (topicStats.totalDuration || 0),
        styles: {
          'news-anchor': newsStats.totalEpisodes || 0,
          'topic-explainer': topicStats.totalPodcasts || 0
        }
      };

      const response = {
        success: true,
        data: {
          episodes: episodes.map(ep => ({
            id: ep.episodeId,
            title: ep.title || `Episode ${ep.episodeId}`,
            description: ep.description,
            audioUrl: ep.audioUrl,
            style: ep.style || 'news-anchor', // 使用episode对象的style属性
            duration: ep.duration,
            fileSize: 0, // 暂时使用默认值
            publishedAt: ep.publishedAt || ep.createdAt,
            createdAt: ep.createdAt,
            transcriptUrl: ep.transcript || null
          })),
          pagination: {
            limit,
            offset,
            total: stats.totalEpisodes || 0
          },
          stats
        }
      };

      return this.jsonResponse(response);

    } catch (error) {
      this.logger.error('Episodes fetch failed', error);
      return this.jsonResponse({
        success: false,
        error: 'Failed to fetch episodes'
      }, 500);
    }
  }

  /**
   * 处理单个剧集详情请求
   */
  async handleEpisodeDetail(request, services, params) {
    try {
      const episodeId = params[0];

      if (!episodeId) {
        return this.jsonResponse({
          success: false,
          error: 'Episode ID is required'
        }, 400);
      }

      this.logger.info('Fetching episode detail via NewsPodcastService', { episodeId });

      // 使用新的业务服务
      const podcastService = services.newsPodcastService;
      const episode = await podcastService.getPodcastById(episodeId);

      if (!episode) {
        return this.jsonResponse({
          success: false,
          error: 'Episode not found'
        }, 404);
      }

      return this.jsonResponse({
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
          ttsError: episode.ttsError || episode.tts_error,
          transcriptUrl: episode.scriptUrl || episode.transcriptUrl || episode.transcript || null
        }
      });

    } catch (error) {
      this.logger.error('Episode detail fetch failed', error);
      return this.jsonResponse({
        success: false,
        error: 'Failed to fetch episode detail'
      }, 500);
    }
  }

  /**
   * 处理音频轮询请求
   */
  async handlePollAudio(request, services, params) {
    try {
      const episodeId = params[0];

      if (!episodeId) {
        return this.jsonResponse({
          success: false,
          error: 'Episode ID is required'
        }, 400);
      }

      this.logger.info('Polling audio for episode via NewsPodcastService', { episodeId });

      // 使用新的业务服务进行轮询
      const podcastService = services.newsPodcastService;

      try {
        const pollResult = await podcastService.pollGeneration(episodeId);

      // 根据轮询结果返回相应的响应
      if (pollResult.status === 'completed') {
        return this.jsonResponse({
          success: true,
          status: 'completed',
          audioUrl: pollResult.podcast?.audioUrl
        });
      } else if (pollResult.status === 'failed') {
        return this.jsonResponse({
          success: false,
          status: 'failed',
          error: pollResult.error
        }, 500);
      } else {
        // 仍在处理中
        return this.jsonResponse({
          success: true,
          status: 'processing',
          message: 'Audio generation in progress'
        });
      }

      } catch (error) {
        return this.jsonResponse({
          success: false,
          error: error.message
        }, 404);
      }

    } catch (error) {
      this.logger.error('Audio polling failed', error);
      return this.jsonResponse({
        success: false,
        error: 'Audio polling failed: ' + error.message
      }, 500);
    }
  }
}
