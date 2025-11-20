/**
 * Podcast工作流协调器 - 协调各个步骤的执行
 * 遵循单一职责原则，只负责工作流编排
 */

import { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retryUtils.js';

export class PodcastWorkflow {
  constructor(options = {}) {
    this.logger = new Logger('PodcastWorkflow');
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };
  }

  /**
  * 执行完整的Podcast生成工作流
  */
  async executeWorkflow(context) {
    const useAsyncTts = context.options?.useAsyncTts || false;
    if (useAsyncTts) {
      return await this.executeAsyncWorkflow(context);
    }
    const steps = [
      { name: 'fetchNews', fn: this._fetchNews.bind(this) },
      { name: 'generateScript', fn: this._generateScript.bind(this) },
      { name: 'generateAudio', fn: this._generateAudio.bind(this) },
      { name: 'generateSubtitles', fn: this._generateSubtitles.bind(this) },
      { name: 'storeFiles', fn: this._storeFiles.bind(this) },
      { name: 'saveMetadata', fn: this._saveMetadata.bind(this) }
    ];

    const results = {};

    for (const step of steps) {
      try {
        this.logger.info(`Executing workflow step: ${step.name}`);
        results[step.name] = await withRetry(
          () => step.fn(context, results),
          {
            maxAttempts: this.options.maxRetries,
            initialDelay: this.options.retryDelay
          },
          this.logger
        );
        this.logger.info(`Workflow step ${step.name} completed successfully`);
      } catch (error) {
        this.logger.error(`Workflow step ${step.name} failed`, error);
        throw new Error(`Workflow failed at step ${step.name}: ${error.message}`);
      }
    }

    return results;
    }

  /**
   * 执行异步Podcast生成工作流（语音生成异步）
   */
  async executeAsyncWorkflow(context) {
    const steps = [
      { name: 'fetchNews', fn: this._fetchNews.bind(this) },
      { name: 'generateScript', fn: this._generateScript.bind(this) },
      { name: 'initiateAudio', fn: this._initiateAudio.bind(this) },
      { name: 'generateSubtitles', fn: this._generateSubtitles.bind(this) },
      { name: 'storeFiles', fn: this._storeScriptAndSubtitles.bind(this) },
      { name: 'saveMetadata', fn: this._saveMetadata.bind(this) }
    ];

    const results = {};

    for (const step of steps) {
      try {
        this.logger.info(`Executing async workflow step: ${step.name}`);
        results[step.name] = await withRetry(
          () => step.fn(context, results),
          {
            maxAttempts: this.options.maxRetries,
            initialDelay: this.options.retryDelay
          },
          this.logger
        );
        this.logger.info(`Async workflow step ${step.name} completed successfully`);
      } catch (error) {
        this.logger.error(`Async workflow step ${step.name} failed`, error);
        throw new Error(`Async workflow failed at step ${step.name}: ${error.message}`);
      }
    }

    return results;
  }

  // 各个步骤的实现委托给具体的服务
  async _fetchNews(context, previousResults) {
    return await context.services.rssService.fetchNews(context.options);
  }

  async _generateScript(context, previousResults) {
    const news = previousResults.fetchNews;
    // 适配新的脚本服务接口
    const contentData = {
      type: 'news',
      data: news
    };
    return await context.services.scriptService.generateScript(contentData, context.style);
  }

  async _generateAudio(context, previousResults) {
  const script = previousResults.generateScript;
  return await context.services.voiceService.generateAudio(script.content, context.style);
  }

  async _initiateAudio(context, previousResults) {
    const script = previousResults.generateScript;
    const result = await context.services.asyncVoiceService.initiateGeneration(
      script.content,
      context.style,
      context.episodeId
    );
    // 添加 isAsync 标记
    result.isAsync = true;
    return result;
  }

  async _generateSubtitles(context, previousResults) {
  const script = previousResults.generateScript;
  const voice = previousResults.generateAudio || previousResults.initiateAudio;

  // 如果是异步模式，估算时长（每分钟约150字）
  const duration = voice.duration || Math.ceil(script.content.length / 150) * 60;

  return await context.services.subtitleService.generateSubtitles(
      script.content,
      duration,
      { isChunked: false }
    );
  }

  async _storeFiles(context, previousResults) {
    const script = previousResults.generateScript;
    const voice = previousResults.generateAudio || previousResults.initiateAudio;
    const subtitles = previousResults.generateSubtitles;

    // 在异步模式下，voice 可能没有音频数据
    return await context.services.storageService.storeFiles(script, voice, subtitles, context.episodeId);
  }

  async _storeScriptAndSubtitles(context, previousResults) {
    const script = previousResults.generateScript;
    const voice = previousResults.initiateAudio; // 异步模式下只有initiateAudio，没有实际音频
    const subtitles = previousResults.generateSubtitles;

    // 使用现有的storeFiles方法，但传递空的音频数据
    return await context.services.storageService.storeFiles(script, voice, subtitles, context.episodeId);
  }

  async _saveMetadata(context, previousResults) {
    const episodeData = this._buildEpisodeData(context, previousResults);
    return await context.services.database.saveEpisode(episodeData);
  }

  _buildEpisodeData(context, results) {
  const voice = results.generateAudio || results.initiateAudio;
  const isAsync = results.initiateAudio ? true : false;

  // 构建完整的剧集数据对象
  return {
  id: context.episodeId,
  title: this._generateTitle(results.fetchNews, context.style),
  description: this._generateDescription(results.fetchNews),
  style: context.style,
  newsCount: results.fetchNews.length,
  wordCount: results.generateScript.wordCount,
  duration: voice.duration || 0,
  fileSize: voice.fileSize || 0,
  scriptUrl: results.storeFiles.scriptUrl,
  audioUrl: results.storeFiles.audioUrl,
  srtUrl: results.storeFiles.srtUrl,
  vttUrl: results.storeFiles.vttUrl,
  jsonUrl: results.storeFiles.jsonUrl,
  isAsync,
  ttsEventId: voice.eventId,
  ttsStatus: voice.status || 'processing',
    metadata: {
        scriptMetadata: results.generateScript.metadata,
        voiceMetadata: voice.metadata,
        subtitleMetadata: results.generateSubtitles.metadata,
        storageMetadata: results.storeFiles.metadata
      }
    };
  }

  _generateTitle(news, style) {
    // 标题生成逻辑
    const styleNames = {
      'news-anchor': 'Today Hot Topics',
      'emotional': 'News播报'
    };
    return `${styleNames[style] || 'News播报'} - ${new Date().toLocaleDateString('zh-CN')}`;
  }

  _generateDescription(news) {
    // 描述生成逻辑
    return `Today HotNews：${news.slice(0, 3).map(item => item.title.split(' - ')[0]).join('；')}...`;
  }
}
