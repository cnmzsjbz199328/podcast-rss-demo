/**
 * Podcast生成器 - 主控制器 (重构版)
 * 遵循单一职责原则，专注于协调各个服务
 */

import { Logger } from '../utils/logger.js';
import { PodcastWorkflow } from './PodcastWorkflow.js';
import { safeExecute, validateServiceInterface } from '../utils/errorHandling.js';

export class PodcastGenerator {
  /**
   * 创建Podcast生成器
   * @param {Object} services - 服务实例
   * @param {Object} config - 配置对象
   */
  constructor(services, config = {}) {
    // 验证服务接口
    this._validateServices(services);

    this.services = services;
    this.config = config;
    this.logger = new Logger('PodcastGenerator');

    // 使用工作流协调器
    this.workflow = new PodcastWorkflow({
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000
    });
  }

  /**
  * 生成Podcast
  * @param {string} style - Podcast风格
  * @param {Object} options - 生成选项
  * @returns {Promise<PodcastResult>} 生成结果
  */
  async generatePodcast(style = 'news-anchor', options = {}) {
    const useAsyncTts = options.useAsyncTts || false;
    return safeExecute(async () => {
      this.logger.info('Starting podcast generation', { style, options });

      const episodeId = this._generateEpisodeId(style);
      const context = {
      services: this.services,
      style,
      episodeId,
      options: { ...this.config, ...options, useAsyncTts }
      };

      // 执行完整工作流
      const results = await this.workflow.executeWorkflow(context);

      const result = this._buildFinalResult(episodeId, results);
      this.logger.info('Podcast generation completed successfully', {
        episodeId,
        title: result.title,
        duration: result.duration
      });

      return result;
    }, null, 'PodcastGenerator.generatePodcast');
  }

  /**
   * 验证服务接口
   */
  _validateServices(services) {
  const requiredServices = ['rssService', 'scriptService', 'voiceService', 'storageService', 'database'];
    const optionalServices = ['asyncVoiceService'];

  for (const serviceName of requiredServices) {
  if (!services[serviceName]) {
    throw new Error(`Missing required service: ${serviceName}`);
    }
    }

  // 验证关键服务接口
  validateServiceInterface(services.scriptService, ['generateScript']);
  validateServiceInterface(services.voiceService, ['generateAudio']);
    validateServiceInterface(services.storageService, ['storeFiles']);

    // 验证可选服务接口
    if (services.asyncVoiceService) {
      validateServiceInterface(services.asyncVoiceService, ['initiateGeneration', 'pollAndProcess']);
    }
  }

  /**
   * 生成剧集ID
   */
  _generateEpisodeId(style) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const randomId = Math.random().toString(36).substring(2, 8);
    return `${style}-${timestamp}-${randomId}`;
  }

  /**
   * 构建最终结果
   */
  _buildFinalResult(episodeId, results) {
  const storage = results.storeFiles;
  const voice = results.generateAudio || results.initiateAudio;
  const isAsync = results.initiateAudio ? true : false;

  return {
  episodeId,
  title: results.generateScript?.title || `Podcast - ${episodeId}`,
  description: results.generateScript?.description || 'AI生成的Podcast内容',
  style: results.generateScript?.style || 'news-anchor',
  newsCount: results.fetchNews?.length || 0,
  wordCount: results.generateScript?.wordCount || 0,
  duration: voice?.duration || 0,
  fileSize: voice?.fileSize || 0,
  scriptUrl: storage?.scriptUrl,
  audioUrl: storage?.audioUrl,
  srtUrl: storage?.srtUrl,
  vttUrl: storage?.vttUrl,
  jsonUrl: storage?.jsonUrl,
  isAsync,
  ttsEventId: voice?.eventId,
  status: voice?.status || 'completed',
  generatedAt: new Date().toISOString(),
    metadata: {
        scriptMetadata: results.generateScript?.metadata,
        voiceMetadata: voice?.metadata,
        subtitleMetadata: results.generateSubtitles?.metadata,
        storageMetadata: storage?.metadata
      }
    };
  }
}
