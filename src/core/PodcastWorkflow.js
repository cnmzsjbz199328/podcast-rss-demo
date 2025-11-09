/**
 * 播客工作流协调器 - 协调各个步骤的执行
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
   * 执行完整的播客生成工作流
   */
  async executeWorkflow(context) {
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

  // 各个步骤的实现委托给具体的服务
  async _fetchNews(context, previousResults) {
    return await context.services.rssService.fetchNews(context.options);
  }

  async _generateScript(context, previousResults) {
    const news = previousResults.fetchNews;
    return await context.services.scriptService.generateScript(news, context.style);
  }

  async _generateAudio(context, previousResults) {
    const script = previousResults.generateScript;
    return await context.services.voiceService.generateAudio(script.content, context.style);
  }

  async _generateSubtitles(context, previousResults) {
    const script = previousResults.generateScript;
    const voice = previousResults.generateAudio;
    return await context.services.subtitleService.generateSubtitles(
      script.content,
      voice.duration,
      { isChunked: false } // 暂时固定为非分块模式
    );
  }

  async _storeFiles(context, previousResults) {
    const script = previousResults.generateScript;
    const voice = previousResults.generateAudio;
    const subtitles = previousResults.generateSubtitles;
    return await context.services.storageService.storeFiles(script, voice, subtitles, context.episodeId);
  }

  async _saveMetadata(context, previousResults) {
    const episodeData = this._buildEpisodeData(context, previousResults);
    return await context.services.database.saveEpisode(episodeData);
  }

  _buildEpisodeData(context, results) {
    // 构建完整的剧集数据对象
    return {
      id: context.episodeId,
      title: this._generateTitle(results.fetchNews, context.style),
      description: this._generateDescription(results.fetchNews),
      style: context.style,
      newsCount: results.fetchNews.length,
      wordCount: results.generateScript.wordCount,
      duration: results.generateAudio.duration,
      fileSize: results.generateAudio.fileSize,
      scriptUrl: results.storeFiles.scriptUrl,
      audioUrl: results.storeFiles.audioUrl,
      srtUrl: results.storeFiles.srtUrl,
      vttUrl: results.storeFiles.vttUrl,
      jsonUrl: results.storeFiles.jsonUrl,
      metadata: {
        scriptMetadata: results.generateScript.metadata,
        voiceMetadata: results.generateAudio.metadata,
        subtitleMetadata: results.generateSubtitles.metadata,
        storageMetadata: results.storeFiles.metadata
      }
    };
  }

  _generateTitle(news, style) {
    // 标题生成逻辑
    const styleNames = {
      'news-anchor': '今日热点播报',
      'emotional': '新闻播报'
    };
    return `${styleNames[style] || '新闻播报'} - ${new Date().toLocaleDateString('zh-CN')}`;
  }

  _generateDescription(news) {
    // 描述生成逻辑
    return `今日热点新闻：${news.slice(0, 3).map(item => item.title.split(' - ')[0]).join('；')}...`;
  }
}
