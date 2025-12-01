/**
 * 主题API处理器 - 处理主题管理相关的API请求
 */
import { Logger } from '../utils/logger.js';
import { jsonResponse as corsJsonResponse } from '../utils/http.js';

export class TopicApiHandler {
  constructor() {
    this.logger = new Logger('TopicApiHandler');
  }

  jsonResponse(body, status = 200) {
    return corsJsonResponse(body, status, { 'Content-Type': 'application/json' });
  }

  /**
  * 创建新主题
  */
  async handleCreateTopic(request, services) {
   try {
     const {
       title,
       description,
       is_active = true,
       generation_interval_hours = 24,
       category,
       keywords
     } = await request.json();

     if (!title) {
       return this.jsonResponse({
         success: false,
         error: 'Title is required'
       }, 400);
     }

    this.logger.info('Creating new topic', { title, is_active, generation_interval_hours, category });

    const topicId = await services.topicRepository.create({
      title,
      description,
      is_active,
      generation_interval_hours,
      category,
      keywords
    });  return this.jsonResponse({
        success: true,
      data: { topicId }
  });

  } catch (error) {
  this.logger.error('Failed to create topic', error);
  return this.jsonResponse({
    success: false,
      error: error.message
      }, 500);
    }
  }

  /**
   * 获取主题列表
   */
  async handleGetTopics(request, services) {
    try {
      const url = new URL(request.url);
      const is_active = url.searchParams.get('is_active');
      const category = url.searchParams.get('category');
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      // 转换字符串参数为布尔值
      const isActiveFilter = is_active === null ? undefined : is_active === 'true';

      this.logger.info('Fetching topics', { is_active: isActiveFilter, category, limit, offset });

      const topicsData = await services.topicRepository.getTopics({
        is_active: isActiveFilter,
        category,
        limit,
        offset
      });

      // 返回完整的主题信息，包括激活状态
      const topics = topicsData.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        is_active: Boolean(t.is_active),
        category: t.category,
        episode_count: t.episode_count,
        generation_interval_hours: t.generation_interval_hours,
        created_at: t.created_at,
        last_generated_at: t.last_generated_at
      }));

      return this.jsonResponse({
        success: true,
        data: {
          topics,
          pagination: {
            limit,
            offset,
            total: topics.length
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to fetch topics', error);
      return this.jsonResponse({
        success: false,
        error: error.message
      }, 500);
    }
  }

  /**
   * 获取单个主题详情
   */
  async handleGetTopic(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return this.jsonResponse({
          success: false,
          error: 'Invalid topic ID'
        }, 400);
      }

      this.logger.info('Fetching topic details', { topicId });

      const topic = await services.topicRepository.getTopic(topicId);

      if (!topic) {
        return this.jsonResponse({
          success: false,
          error: 'Topic not found'
        }, 404);
      }

      // 获取主题统计信息
      const statistics = await services.topicRepository.getStatistics(topicId);

      return this.jsonResponse({
        success: true,
        data: statistics
      });

    } catch (error) {
      this.logger.error('Failed to fetch topic', error);
      return this.jsonResponse({
        success: false,
        error: error.message
      }, 500);
    }
  }

  /**
   * 更新主题信息
   */
  async handleUpdateTopic(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return this.jsonResponse({
          success: false,
          error: 'Invalid topic ID'
        }, 400);
      }

      const updates = await request.json();

      this.logger.info('Updating topic', { topicId, updates: Object.keys(updates) });

      const success = await services.topicRepository.update(topicId, updates);

      if (!success) {
        return this.jsonResponse({
          success: false,
          error: 'Topic not found or update failed'
        }, 404);
      }

      return this.jsonResponse({
        success: true,
        message: 'Topic updated successfully'
      });

    } catch (error) {
      this.logger.error('Failed to update topic', error);
      return this.jsonResponse({
        success: false,
        error: error.message
      }, 500);
    }
  }

  /**
   * 删除主题
   */
  async handleDeleteTopic(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return this.jsonResponse({
          success: false,
          error: 'Invalid topic ID'
        }, 400);
      }

      this.logger.info('Deleting topic', { topicId });

      const success = await services.topicRepository.delete(topicId);

      if (!success) {
        return this.jsonResponse({
          success: false,
          error: 'Topic not found or delete failed'
        }, 404);
      }

      return this.jsonResponse({
        success: true,
        message: 'Topic deleted successfully'
      });

    } catch (error) {
      this.logger.error('Failed to delete topic', error);
      return this.jsonResponse({
        success: false,
        error: error.message
      }, 500);
    }
  }

  /**
   * 生成主题播客
   */
  async handleGenerateTopicPodcast(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return this.jsonResponse({
          success: false,
          error: 'Invalid topic ID'
        }, 400);
      }

      const url = new URL(request.url);
      const style = url.searchParams.get('style') || 'topic-explainer';
      const useAsyncTts = url.searchParams.get('useAsyncTts') === 'true';

      this.logger.info('Generating topic podcast', { topicId, style, useAsyncTts });

      const podcastService = services.topicPodcastService;

      let result;
      if (useAsyncTts) {
        result = await podcastService.generatePodcastAsync({ topicId, style });
      } else {
        result = await podcastService.generatePodcast({ topicId, style });
      }

      this.logger.info('Topic podcast generated successfully', {
        topicId,
        episodeId: result.episodeId,
        status: result.status
      });

      return this.jsonResponse({
        success: true,
        data: result
      });

    } catch (error) {
      this.logger.error('Failed to generate topic podcast', error);
      return this.jsonResponse({
        success: false,
        error: error.message
      }, 500);
    }
  }

  /**
    * 获取主题播客列表（精简版本）
    */
  async handleGetTopicPodcasts(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return this.jsonResponse({
          success: false,
          error: 'Invalid topic ID'
        }, 400);
      }

      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '1000', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      this.logger.info('Fetching topic podcasts', { topicId, status, limit, offset });

      const podcastService = services.topicPodcastService;
      const result = await podcastService.getPodcasts({
        topicId,
        status,
        limit,
        offset,
        withTotal: true
      });

      // 处理返回值（可能是数组或包含总数的对象）
      let podcasts = [];
      let total = 0;

      if (Array.isArray(result)) {
        podcasts = result;
        total = result.length;
      } else if (result && typeof result === 'object' && result.podcasts) {
        podcasts = result.podcasts;
        total = result.total;
      }

      // 精简返回数据：返回 episodeId、title 和 createdAt
      const simplifiedPodcasts = podcasts.map(p => ({
        episodeId: p.episodeId,
        title: p.title,
        createdAt: p.createdAt
      }));

      return this.jsonResponse({
        success: true,
        data: {
          podcasts: simplifiedPodcasts,
          pagination: {
            limit,
            offset,
            total
          }
        }
      });

    } catch (error) {
      this.logger.error('Failed to fetch topic podcasts', error);
      return this.jsonResponse({
        success: false,
        error: error.message
      }, 500);
    }
  }

  /**
  * 轮询主题播客生成状态
  */
  async handlePollTopicPodcast(request, services, params) {
  try {
  const episodeId = params[0];

  if (!episodeId) {
  return this.jsonResponse({
  success: false,
  error: 'Episode ID is required'
  }, 400);
  }

  this.logger.info('Polling topic podcast generation status', { episodeId });

  const podcastService = services.topicPodcastService;
  const pollResult = await podcastService.pollGeneration(episodeId);

  return this.jsonResponse({
  success: true,
  status: pollResult.status,
  podcast: pollResult.podcast,
  error: pollResult.error
  });

  } catch (error) {
  this.logger.error('Failed to poll topic podcast generation', error);
  return this.jsonResponse({
  success: false,
  error: error.message
  }, 500);
  }
  }

  /**
   * 生成主题的下一集播客（系列延续）
   */
  async handleGenerateNextEpisode(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return this.jsonResponse({
          success: false,
          error: 'Invalid topic ID'
        }, 400);
      }

      const url = new URL(request.url);
      const style = url.searchParams.get('style') || 'topic-explainer';

      this.logger.info('Generating next episode for topic', { topicId, style });

      // 使用 TopicSeriesGenerator 生成下一集
      const seriesGenerator = services.topicSeriesGenerator;
      const episodeInfo = await seriesGenerator.generateNextEpisode(topicId);

      if (!episodeInfo) {
        return this.jsonResponse({
          success: false,
          message: 'Generation interval not reached yet'
        });
      }

      // 使用 TopicPodcastService 生成完整的播客
      const podcastService = services.topicPodcastService;
      const result = await podcastService.generatePodcastWithContent({
        topicId: episodeInfo.topicId,
        episodeNumber: episodeInfo.episodeNumber,
        title: episodeInfo.title,
        keywords: episodeInfo.keywords,
        abstract: episodeInfo.abstract,
        script: episodeInfo.script,
        style
      });

      // 更新主题的最后生成时间
      await services.topicRepository.updateLastGenerated(
        topicId,
        new Date().toISOString()
      );

      this.logger.info('Next episode generated successfully', {
        topicId,
        episodeNumber: episodeInfo.episodeNumber,
        episodeId: result.episodeId
      });

      return this.jsonResponse({
        success: true,
        data: {
          topicId,
          episodeNumber: episodeInfo.episodeNumber,
          title: episodeInfo.title,
          keywords: episodeInfo.keywords,
          abstract: episodeInfo.abstract,
          episodeId: result.episodeId,
          status: result.status,
          duration: result.duration
        }
      });

    } catch (error) {
      this.logger.error('Failed to generate next episode', error);
      return this.jsonResponse({
        success: false,
        error: error.message
      }, 500);
    }
  }
}
