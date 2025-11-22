/**
 * 主题API处理器 - 处理主题管理相关的API请求
 */
import { Logger } from '../utils/logger.js';

export class TopicApiHandler {
  constructor() {
    this.logger = new Logger('TopicApiHandler');
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
  generation_interval_hours = 24
  } = await request.json();

  if (!title) {
  return new Response(JSON.stringify({
    success: false,
      error: 'Title is required'
        }), {
      status: 400,
          headers: { 'Content-Type': 'application/json' }
    });
  }

  this.logger.info('Creating new topic', { title, is_active, generation_interval_hours });

  const topicId = await services.topicRepository.create({
        title,
    description,
  is_active,
  generation_interval_hours
  });

  return new Response(JSON.stringify({
        success: true,
      data: { topicId }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  } catch (error) {
  this.logger.error('Failed to create topic', error);
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

      const topics = await services.topicRepository.getTopics({
        is_active: isActiveFilter,
        category,
        limit,
        offset
      });

      return new Response(JSON.stringify({
        success: true,
        data: {
          topics,
          pagination: {
            limit,
            offset,
            total: topics.length // 简化处理，实际应该从数据库获取总数
          }
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Failed to fetch topics', error);
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
   * 获取单个主题详情
   */
  async handleGetTopic(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid topic ID'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      this.logger.info('Fetching topic details', { topicId });

      const topic = await services.topicRepository.getTopic(topicId);

      if (!topic) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Topic not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 获取主题统计信息
      const statistics = await services.topicRepository.getStatistics(topicId);

      return new Response(JSON.stringify({
        success: true,
        data: statistics
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Failed to fetch topic', error);
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
   * 更新主题信息
   */
  async handleUpdateTopic(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid topic ID'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const updates = await request.json();

      this.logger.info('Updating topic', { topicId, updates: Object.keys(updates) });

      const success = await services.topicRepository.update(topicId, updates);

      if (!success) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Topic not found or update failed'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Topic updated successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Failed to update topic', error);
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
   * 删除主题
   */
  async handleDeleteTopic(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid topic ID'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      this.logger.info('Deleting topic', { topicId });

      const success = await services.topicRepository.delete(topicId);

      if (!success) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Topic not found or delete failed'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Topic deleted successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Failed to delete topic', error);
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
   * 生成主题播客
   */
  async handleGenerateTopicPodcast(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid topic ID'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
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

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Failed to generate topic podcast', error);
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
   * 获取主题播客列表
   */
  async handleGetTopicPodcasts(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid topic ID'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      this.logger.info('Fetching topic podcasts', { topicId, status, limit, offset });

      const podcastService = services.topicPodcastService;
      const result = await podcastService.getPodcasts({
        topicId,
        status,
        limit,
        offset
      });

      return new Response(JSON.stringify({
        success: true,
        data: {
          podcasts: result,
          pagination: {
            limit,
            offset,
            total: result.length // 简化处理
          }
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Failed to fetch topic podcasts', error);
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
  * 轮询主题播客生成状态
  */
  async handlePollTopicPodcast(request, services, params) {
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

  this.logger.info('Polling topic podcast generation status', { episodeId });

  const podcastService = services.topicPodcastService;
  const pollResult = await podcastService.pollGeneration(episodeId);

  return new Response(JSON.stringify({
  success: true,
  status: pollResult.status,
  podcast: pollResult.podcast,
  error: pollResult.error
  }), {
  headers: { 'Content-Type': 'application/json' }
  });

  } catch (error) {
  this.logger.error('Failed to poll topic podcast generation', error);
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
   * 生成主题的下一集播客（系列延续）
   */
  async handleGenerateNextEpisode(request, services, params) {
    try {
      const topicId = parseInt(params[0], 10);

      if (!topicId || isNaN(topicId)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid topic ID'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const url = new URL(request.url);
      const style = url.searchParams.get('style') || 'topic-explainer';

      this.logger.info('Generating next episode for topic', { topicId, style });

      // 使用 TopicSeriesGenerator 生成下一集
      const seriesGenerator = services.topicSeriesGenerator;
      const episodeInfo = await seriesGenerator.generateNextEpisode(topicId);

      if (!episodeInfo) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Generation interval not reached yet'
        }), { status: 200, headers: { 'Content-Type': 'application/json' }});
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

      return new Response(JSON.stringify({
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
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Failed to generate next episode', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}
