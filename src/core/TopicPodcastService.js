import { IPodcastService } from './IPodcastService.js';
import { PodcastWorkflow } from './PodcastWorkflow.js';
import {
  TopicPodcastHelper,
  TopicPodcastPollHelper,
  TopicContentServiceAdapter,
  TopicScriptServiceAdapter
} from './TopicPodcastHelper.js';
import { Logger } from '../utils/logger.js';

/**
 * 主题播客服务
 * 实现基于主题的播客生成
 *
 * 特点：
 * - 使用主题信息而非RSS新闻
 * - 支持多个主题播客剧集的管理
 * - 通过TopicRepository和TopicPodcastRepository管理数据
 */
export class TopicPodcastService extends IPodcastService {
  constructor(services, topicRepository, topicPodcastRepository, options = {}) {
    super();
    this.services = services;
    this.topicRepository = topicRepository;
    this.topicPodcastRepository = topicPodcastRepository;
    this.workflow = new PodcastWorkflow(options);
    this.pollHelper = new TopicPodcastPollHelper(services, topicPodcastRepository);
    this.logger = new Logger('TopicPodcastService');
  }

  /**
   * 生成主题播客（同步模式）
   * @param {Object} options - 生成选项
   * @param {string} options.topicId - 主题ID
   * @param {string} [options.style='topic-explainer'] - 播客风格
   * @returns {Promise<PodcastResult>} 播客生成结果
   */
  async generatePodcast(options) {
    const { topicId, style = 'topic-explainer' } = options;

    if (!topicId) {
      throw new Error('topicId is required for topic podcast generation');
    }

    this.logger.info('Starting synchronous topic podcast generation', { topicId, style });

    try {
      // 获取主题信息
      const topic = await this.topicRepository.getTopic(topicId);
      if (!topic) {
        throw new Error(`Topic not found: ${topicId}`);
      }

      // 构建工作流上下文（主题模式）
      const context = {
        episodeId: TopicPodcastHelper.generateEpisodeId(topicId),
        style,
        services: this._createTopicServices(topic),
        options: { useAsyncTts: false },
        topicId
      };

      // 执行工作流
      const results = await this.workflow.executeWorkflow(context);

      // 保存主题播客记录
      await this._saveTopicPodcast(context.episodeId, topicId, results, false);

      const podcastResult = TopicPodcastHelper.formatPodcastResult(
        results,
        context.episodeId,
        topicId,
        false
      );

      this.logger.info('Topic podcast generation completed', {
        episodeId: context.episodeId,
        topicId,
        duration: podcastResult.duration
      });

      return podcastResult;

    } catch (error) {
      this.logger.error('Topic podcast generation failed', error);
      throw new Error(`Topic podcast generation failed: ${error.message}`);
    }
  }

  /**
   * 生成主题播客（异步模式）
   * @param {Object} options - 生成选项
   * @param {string} options.topicId - 主题ID
   * @param {string} [options.style='topic-explainer'] - 播客风格
   * @returns {Promise<{episodeId: string, status: string, ttsEventId: string}>} 异步任务信息
   */
  async generatePodcastAsync(options) {
    const { topicId, style = 'topic-explainer' } = options;

    if (!topicId) {
      throw new Error('topicId is required for topic podcast generation');
    }

    this.logger.info('Starting asynchronous topic podcast generation', { topicId, style });

    try {
      // 获取主题信息
      const topic = await this.topicRepository.getTopic(topicId);
      if (!topic) {
        throw new Error(`Topic not found: ${topicId}`);
      }

      // 构建工作流上下文
      const context = {
        episodeId: TopicPodcastHelper.generateEpisodeId(topicId),
        style,
        services: this._createTopicServices(topic),
        options: { useAsyncTts: true },
        topicId
      };

      // 执行异步工作流
      const results = await this.workflow.executeAsyncWorkflow(context);

      // 保存主题播客记录
      await this._saveTopicPodcast(context.episodeId, topicId, results, true);

      const asyncResult = TopicPodcastHelper.formatPodcastResult(
        results,
        context.episodeId,
        topicId,
        true
      );

      this.logger.info('Topic podcast async generation initiated', {
        episodeId: context.episodeId,
        topicId,
        ttsEventId: asyncResult.ttsEventId
      });

      return asyncResult;

    } catch (error) {
      this.logger.error('Topic podcast async generation failed', error);
      throw new Error(`Topic podcast async generation failed: ${error.message}`);
    }
  }

  /**
   * 查询主题播客列表
   * @param {Object} filters - 过滤条件
   * @param {string} [filters.topicId] - 主题ID（必需）
   * @param {string} [filters.status] - 状态过滤
   * @param {number} [filters.limit=10] - 限制数量
   * @param {number} [filters.offset=0] - 偏移量
   * @returns {Promise<PodcastInfo[]>} 播客列表
   */
  async getPodcasts(filters = {}) {
    const { topicId, status, limit = 10, offset = 0 } = filters;

    if (!topicId) {
      throw new Error('topicId is required for topic podcast queries');
    }

    this.logger.info('Fetching topic podcasts', { topicId, status, limit, offset });

    try {
      const topicPodcasts = await this.topicPodcastRepository.getByTopic(topicId, {
        status,
        limit,
        offset
      });

      const formattedPodcasts = TopicPodcastHelper.formatPodcastList(topicPodcasts);

      return formattedPodcasts;

    } catch (error) {
      this.logger.error('Failed to fetch topic podcasts', error);
      throw new Error(`Failed to fetch topic podcasts: ${error.message}`);
    }
  }

  /**
   * 根据ID查询主题播客
   * @param {string} id - 播客ID（episode_id）
   * @returns {Promise<PodcastInfo>} 播客信息
   */
  async getPodcastById(id) {
    this.logger.info('Fetching topic podcast by ID', { episodeId: id });

    try {
      const podcast = await this.topicPodcastRepository.getById(id);

      if (!podcast) {
        throw new Error(`Topic podcast not found: ${id}`);
      }

      return TopicPodcastHelper.formatPodcastDetail(podcast);

    } catch (error) {
      this.logger.error('Failed to fetch topic podcast by ID', error);
      throw new Error(`Failed to fetch topic podcast: ${error.message}`);
    }
  }

  /**
   * 轮询异步生成状态
   * @param {string} episodeId - 播客ID
   * @returns {Promise<{status: string, podcast?: PodcastInfo, error?: string}>} 生成状态
   */
  async pollGeneration(episodeId) {
    this.logger.info('Polling topic podcast generation status', { episodeId });

    try {
      return await this.pollHelper.pollGeneration(episodeId);
    } catch (error) {
      this.logger.error('Failed to poll topic podcast generation', error);
      throw new Error(`Failed to poll generation: ${error.message}`);
    }
  }

  /**
   * 保存主题播客记录
   * @private
   * @param {string} episodeId - 剧集ID
   * @param {number} topicId - 主题ID
   * @param {Object} results - 工作流结果
   * @param {boolean} isAsync - 是否异步
   */
  async _saveTopicPodcast(episodeId, topicId, results, isAsync) {
    const podcastData = {
      topicId,
      episodeId,
      status: isAsync ? 'processing' : 'completed'
    };

    if (isAsync) {
      podcastData.ttsEventId = results.initiateAudio?.eventId;
    } else {
      if (results.storeFiles?.audioUrl) {
        podcastData.audioUrl = results.storeFiles.audioUrl;
        podcastData.duration = results.generateAudio?.duration;
      }
    }

    await this.topicPodcastRepository.create(podcastData);
  }

  /**
   * 创建主题专用服务（替换 RSS 服务为主题内容提供）
   * @private
   */
  _createTopicServices(topic) {
    return {
      ...this.services,
      rssService: new TopicContentServiceAdapter(topic),
      scriptService: new TopicScriptServiceAdapter(this.services.scriptService, topic)
    };
  }
}
