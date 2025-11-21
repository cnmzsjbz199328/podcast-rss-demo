import { Logger } from '../utils/logger.js';

/**
 * Cron触发器处理器
 * 处理定时任务，通过 IPodcastService 抽象调用业务服务
 *
 * 支持的定时任务：
 * - 新闻播客自动生成
 * - 主题播客定时发布
 * - 系统维护任务
 */
export class CronHandler {
  constructor() {
    this.logger = new Logger('CronHandler');
  }

  /**
   * 处理定时触发事件
   * @param {ScheduledEvent} event - Cloudflare Cron 事件
   * @param {Object} env - 环境变量和绑定
   * @param {Object} ctx - 执行上下文
   */
  async handleScheduled(event, env, ctx) {
    this.logger.info('Cron trigger fired', { cron: event.cron });

    try {
      // 初始化服务
      const { serviceInitializer } = await import('../services/ServiceInitializer.js');
      const services = serviceInitializer.getServices(env);

      // 执行定时任务
      const result = await this._executeScheduledTasks(event, services);

      this.logger.info('Scheduled tasks completed', result);

      return result;

    } catch (error) {
      this.logger.error('Scheduled tasks failed', error);

      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * 执行定时任务
   * @private
   * @param {ScheduledEvent} event - Cron 事件
   * @param {Object} services - 服务实例集合
   */
  async _executeScheduledTasks(event, services) {
    const cronExpression = event.cron;
    const results = [];

    try {
      // 根据不同的 cron 表达式执行不同任务
      switch (cronExpression) {
        case '30 14 * * *': // 每天阿德莱德时间14:30 (UTC 5:00)
        case '30 0 * * *':  // 每天阿德莱德时间00:30 (UTC 15:00)
        case '*/5 * * * *': // 每5分钟测试
          results.push(...(await this._generateSeriesEpisodes(services)));
          break;

        case '0 */6 * * *': // 每6小时 (可选的额外任务)
          results.push(await this._performMaintenanceTasks(services));
          break;

        default:
          this.logger.warn('Unknown cron expression', { cronExpression });
          results.push({
            task: 'unknown',
            status: 'skipped',
            reason: `Unknown cron expression: ${cronExpression}`
          });
      }

      // 检查是否有失败的任务
      const hasFailedTasks = results.some(task => task.status === 'failed');
      if (hasFailedTasks) {
        throw new Error(`Some scheduled tasks failed: ${results.filter(t => t.status === 'failed').map(t => t.error).join('; ')}`);
      }

      return {
        success: true,
        cron: cronExpression,
        tasks: results,
        executedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Scheduled tasks execution failed', error);
      throw error;
    }
  }

  /**
   * 生成每日新闻播客
   * @private
   * @param {Object} services - 服务实例集合
   */
  async _generateDailyNewsPodcast(services) {
    console.log('CronHandler: Starting daily news podcast generation');
    this.logger.info('Starting daily news podcast generation');

    try {
      console.log('CronHandler: Getting newsPodcastService');
      const podcastService = services.newsPodcastService;
      console.log('CronHandler: Calling generatePodcast');

      // 生成新闻播客
      const result = await podcastService.generatePodcast({
        style: 'news-anchor'
      });

      console.log('CronHandler: News podcast generated successfully', result);
      this.logger.info('Daily news podcast generated successfully', {
        episodeId: result.episodeId,
        duration: result.duration
      });

      return {
        task: 'daily-news-podcast',
        status: 'completed',
        episodeId: result.episodeId,
        duration: result.duration,
        generatedAt: result.createdAt
      };

    } catch (error) {
      console.error('CronHandler: Daily news podcast generation failed', error);
      this.logger.error('Daily news podcast generation failed', error);

      return {
        task: 'daily-news-podcast',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
  * 生成每日主题播客
  * @private
  * @param {Object} services - 服务实例集合
  * @param {number} topicId - 主题ID
    */
  async _generateDailyTopicPodcast(services, topicId) {
    this.logger.info('Starting daily topic podcast generation', { topicId });

    try {
      const topicPodcastService = services.topicPodcastService;

      const result = await topicPodcastService.generatePodcast({
        topicId,
        style: 'topic-explainer'
      });

      this.logger.info('Daily topic podcast generated successfully', {
        episodeId: result.episodeId,
        topicId,
        duration: result.duration
      });

      return {
        task: 'daily-topic-podcast',
        status: 'completed',
        episodeId: result.episodeId,
        topicId,
        duration: result.duration,
        generatedAt: result.createdAt
      };

    } catch (error) {
      this.logger.error('Daily topic podcast generation failed', error);

      return {
        task: 'daily-topic-podcast',
        status: 'failed',
        topicId,
        error: error.message
      };
    }
  }

  /**
    * 执行维护任务
    * @private
    * @param {Object} services - 服务实例集合
    */
  async _performMaintenanceTasks(services) {
    this.logger.info('Starting maintenance tasks');

    const tasks = [];

    try {
      // 清理失败的任务（可选）
      // 这里可以添加更多的维护任务

      this.logger.info('Maintenance tasks completed', { taskCount: tasks.length });

      return {
        task: 'maintenance',
        status: 'completed',
        subTasks: tasks,
        completedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Maintenance tasks failed', error);

      return {
        task: 'maintenance',
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * 支持多种播客服务的通用调度（未来扩展用）
   * @param {ScheduledEvent} event - Cron 事件
   * @param {Object} env - 环境变量
   * @param {string} serviceType - 服务类型 ('news' | 'topic')
   */
  async handleScheduledWithService(event, env, serviceType = 'news') {
    this.logger.info('Cron trigger with service type', {
      cron: event.cron,
      serviceType
    });

    try {
      const { serviceInitializer } = await import('../services/ServiceInitializer.js');
      const services = serviceInitializer.getServices(env);

      let podcastService;
      let options = {};

      switch (serviceType) {
        case 'news':
          podcastService = services.newsPodcastService;
          options = { style: 'news-anchor' };
          break;

        case 'topic':
          podcastService = services.topicPodcastService;
          // 未来可以实现选择待发布的主题
          options = {
            topicId: await this._getNextPendingTopic(services),
            style: 'topic-explainer'
          };
          break;

        default:
          throw new Error(`Unknown service type: ${serviceType}`);
      }

      if (serviceType === 'topic' && !options.topicId) {
        return {
          success: true,
          message: 'No pending topics to process',
          serviceType
        };
      }

      const result = await podcastService.generatePodcast(options);

      return {
        success: true,
        serviceType,
        episodeId: result.episodeId,
        status: result.status,
        executedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Scheduled service execution failed', error);

      return {
        success: false,
        serviceType,
        error: error.message
      };
    }
  }

  /**
  * 生成系列剧集（扫描激活主题并生成新剧集）
  * @private
  * @param {Object} services - 服务实例集合
  * @returns {Promise<Array>} 生成结果列表
   */
  async _generateSeriesEpisodes(services) {
  const results = [];

    try {
      // 1. 获取所有激活的主题
      const activeTopics = await services.topicRepository.getActiveTopics();
      this.logger.info(`Found ${activeTopics.length} active topics for series generation`);

      // 2. 为每个主题生成下一集
      for (const topic of activeTopics) {
        try {
          const result = await this._generateTopicSeriesEpisode(services, topic);
          if (result) {
            results.push(result);
          }
        } catch (error) {
          this.logger.error(`Failed to generate episode for topic ${topic.id}`, error);
          results.push({
            task: 'topic-series-episode',
            topicId: topic.id,
            topicTitle: topic.title,
            status: 'failed',
            error: error.message
          });
        }
      }

      // 3. 如果没有激活主题，生成新闻播客
      if (activeTopics.length === 0) {
        this.logger.info('No active topics found, generating news podcast');
        results.push(await this._generateDailyNewsPodcast(services));
      }

      return results;

    } catch (error) {
      this.logger.error('Series episodes generation failed', error);
      return [{
        task: 'series-generation',
        status: 'failed',
        error: error.message
      }];
    }
  }

  /**
   * 为主题生成系列剧集
   * @private
   * @param {Object} services - 服务实例集合
   * @param {Object} topic - 主题信息
   */
  async _generateTopicSeriesEpisode(services, topic) {
    this.logger.info('Generating series episode for topic', {
      topicId: topic.id,
      topicTitle: topic.title
    });

    try {
      // 使用 TopicSeriesGenerator 生成下一集
      const seriesGenerator = new TopicSeriesGenerator(
        services.topicRepository,
        services.topicPodcastRepository,
        services.scriptService
      );

      const episodeInfo = await seriesGenerator.generateNextEpisode(topic.id);

      if (!episodeInfo) {
        this.logger.info('Topic generation skipped due to interval', { topicId: topic.id });
        return {
          task: 'topic-series-episode',
          topicId: topic.id,
          status: 'skipped',
          reason: 'Generation interval not reached'
        };
      }

      // 调用 TopicPodcastService 完成完整的播客生成
      const result = await services.topicPodcastService.generatePodcastWithContent({
        topicId: topic.id,
        episodeNumber: episodeInfo.episodeNumber,
        title: episodeInfo.title,
        keywords: episodeInfo.keywords,
        abstract: episodeInfo.abstract,
        script: episodeInfo.script,
        style: 'topic-explainer'
      });

      // 更新主题的最后生成时间
      await services.topicRepository.updateLastGenerated(
        topic.id,
        new Date().toISOString()
      );

      this.logger.info('Topic series episode generated successfully', {
        topicId: topic.id,
        episodeNumber: episodeInfo.episodeNumber,
        episodeId: result.episodeId
      });

      return {
        task: 'topic-series-episode',
        topicId: topic.id,
        topicTitle: topic.title,
        episodeNumber: episodeInfo.episodeNumber,
        episodeId: result.episodeId,
        status: 'completed',
        duration: result.duration
      };

    } catch (error) {
      this.logger.error('Topic series episode generation failed', error);
      throw error;
    }
  }

  /**
    * 获取下一个待处理的主题
    * @private
    * @param {Object} services - 服务实例集合
    */
  async _getNextPendingTopic(services) {
    const topicRepository = services.topicRepository;
    return await topicRepository.getNextPendingTopic();
  }
}
