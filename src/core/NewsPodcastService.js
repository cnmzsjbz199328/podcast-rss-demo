import { IPodcastService } from './IPodcastService.js';
import { PodcastWorkflow } from './PodcastWorkflow.js';
import { NewsPodcastHelper, NewsPodcastPollHelper } from './NewsPodcastHelper.js';
import { Logger } from '../utils/logger.js';

/**
 * 新闻播客服务
 * 实现基于 BBC RSS 的新闻播客生成
 *
 * 使用 PodcastWorkflow 编排生成流程：
 * 1. 获取新闻 → 2. 生成脚本 → 3. 生成语音 → 4. 生成字幕 → 5. 存储文件 → 6. 保存元数据
 */
export class NewsPodcastService extends IPodcastService {
  constructor(services, options = {}) {
    super();
    this.services = services; // 注入的技术服务集合
    this.workflow = new PodcastWorkflow(options);
    this.pollHelper = new NewsPodcastPollHelper(services);
    this.logger = new Logger('NewsPodcastService');
  }

  /**
   * 生成新闻播客（同步模式）
   * @param {Object} options - 生成选项
   * @param {string} [options.style='news-anchor'] - 播客风格
   * @returns {Promise<PodcastResult>} 播客生成结果
   */
  async generatePodcast(options = {}) {
    const { style = 'news-anchor' } = options;

    this.logger.info('Starting synchronous news podcast generation', { style });

    try {
      // 构建工作流上下文
      const context = {
        episodeId: NewsPodcastHelper.generateEpisodeId(),
        style,
        services: this.services,
        options: { useAsyncTts: false }
      };

      // 执行工作流
      const results = await this.workflow.executeWorkflow(context);

      const podcastResult = NewsPodcastHelper.formatPodcastResult(
        results,
        context.episodeId,
        false
      );

      this.logger.info('News podcast generation completed', {
        episodeId: context.episodeId,
        duration: podcastResult.duration
      });

      return podcastResult;

    } catch (error) {
      this.logger.error('News podcast generation failed', error);
      throw new Error(`News podcast generation failed: ${error.message}`);
    }
  }

  /**
   * 生成新闻播客（异步模式）
   * @param {Object} options - 生成选项
   * @param {string} [options.style='news-anchor'] - 播客风格
   * @returns {Promise<{episodeId: string, status: string, ttsEventId: string}>} 异步任务信息
   */
  async generatePodcastAsync(options = {}) {
    const { style = 'news-anchor' } = options;

    this.logger.info('Starting asynchronous news podcast generation', { style });

    try {
      // 构建工作流上下文
      const context = {
        episodeId: NewsPodcastHelper.generateEpisodeId(),
        style,
        services: this.services,
        options: { useAsyncTts: true }
      };

      // 执行异步工作流
      const results = await this.workflow.executeAsyncWorkflow(context);

      const asyncResult = NewsPodcastHelper.formatPodcastResult(
        results,
        context.episodeId,
        true
      );

      this.logger.info('News podcast async generation initiated', {
        episodeId: context.episodeId,
        ttsEventId: asyncResult.ttsEventId
      });

      return asyncResult;

    } catch (error) {
      this.logger.error('News podcast async generation failed', error);
      throw new Error(`News podcast async generation failed: ${error.message}`);
    }
  }

  /**
   * 查询新闻播客列表
   * @param {Object} filters - 过滤条件
   * @param {string} [filters.status] - 状态过滤
   * @param {string} [filters.style] - 风格过滤
   * @param {number} [filters.limit=20] - 限制数量
   * @param {number} [filters.offset=0] - 偏移量
   * @returns {Promise<PodcastInfo[]>} 播客列表
   */
  async getPodcasts(filters = {}) {
    const { status, style, limit = 20, offset = 0 } = filters;

    this.logger.info('Fetching news podcasts', { status, style, limit, offset });

    try {
      let episodes;

      if (style) {
        // 如果指定了风格，使用风格过滤
        episodes = await this.services.database.getEpisodesByStyle(style, limit, offset);
      } else {
        // 否则使用状态过滤
        episodes = await this.services.database.getPublishedEpisodes(limit, offset);
      }

      const formattedEpisodes = NewsPodcastHelper.formatPodcastList(episodes);

      return formattedEpisodes;

    } catch (error) {
      this.logger.error('Failed to fetch news podcasts', error);
      throw new Error(`Failed to fetch news podcasts: ${error.message}`);
    }
  }

  /**
   * 根据ID查询新闻播客
   * @param {string} id - 播客ID（episode_id）
   * @returns {Promise<PodcastInfo>} 播客信息
   */
  async getPodcastById(id) {
    this.logger.info('Fetching news podcast by ID', { episodeId: id });

    try {
  const episode = await this.services.database.getEpisodeById(id);

      if (!episode) {
        throw new Error(`News podcast not found: ${id}`);
      }

      return NewsPodcastHelper.formatPodcastDetail(episode);

    } catch (error) {
      this.logger.error('Failed to fetch news podcast by ID', error);
      throw new Error(`Failed to fetch news podcast: ${error.message}`);
    }
  }

  /**
   * 轮询异步生成状态
   * @param {string} episodeId - 播客ID
   * @returns {Promise<{status: string, podcast?: PodcastInfo, error?: string}>} 生成状态
   */
  async pollGeneration(episodeId) {
    this.logger.info('Polling news podcast generation status', { episodeId });

    try {
      return await this.pollHelper.pollGeneration(episodeId);
    } catch (error) {
      this.logger.error('Failed to poll news podcast generation', error);
      throw new Error(`Failed to poll generation: ${error.message}`);
    }
  }
}
