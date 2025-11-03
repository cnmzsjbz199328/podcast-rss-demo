/**
 * 播客生成器 - 主控制器
 */

import { Logger } from '../utils/logger.js';
import { NewsProcessor } from './NewsProcessor.js';
import { withRetry } from '../utils/retryUtils.js';
import { validateScriptResult, validateVoiceResult, validateStorageResult } from '../utils/validator.js';

export class PodcastGenerator {
  /**
   * 创建播客生成器
   * @param {Object} services - 服务实例
   * @param {Object} config - 配置对象
   */
  constructor(services, config = {}) {
    this.rssService = services.rssService;
    this.scriptService = services.scriptService;
    this.voiceService = services.voiceService;
    this.storageService = services.storageService;

    this.config = config;
    this.logger = new Logger('PodcastGenerator');

    this.newsProcessor = new NewsProcessor(config);
  }

  /**
   * 生成播客
   * @param {string} style - 播客风格
   * @param {Object} options - 生成选项
   * @returns {Promise<PodcastResult>} 生成结果
   */
  async generatePodcast(style = 'news-anchor', options = {}) {
    const startTime = Date.now();
    const episodeId = this._generateEpisodeId(style);

    this.logger.info('Starting podcast generation', {
      style,
      episodeId,
      options
    });

    try {
      // 1. 获取和处理新闻
      const news = await this._fetchAndProcessNews();
      if (news.length === 0) {
        throw new Error('No news available for podcast generation');
      }

      // 2. 生成脚本
      const scriptResult = await this._generateScript(news, style);
      if (!validateScriptResult(scriptResult)) {
        throw new Error('Invalid script result generated');
      }

      // 3. 生成音频
      const voiceResult = await this._generateVoice(scriptResult, style);
      if (!validateVoiceResult(voiceResult)) {
        throw new Error('Invalid voice result generated');
      }

      // 4. 存储文件
      const storageResult = await this._storeFiles(scriptResult, voiceResult, episodeId);
      if (!validateStorageResult(storageResult)) {
        throw new Error('Invalid storage result');
      }

      const duration = Date.now() - startTime;
      const result = this._buildResult(episodeId, news, scriptResult, voiceResult, storageResult);

      this.logger.info('Podcast generation completed successfully', {
        episodeId,
        duration,
        scriptUrl: storageResult.scriptUrl,
        audioUrl: storageResult.audioUrl
      });

      return result;

    } catch (error) {
      this.logger.error('Podcast generation failed', {
        episodeId,
        error: error.message,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * 获取和处理新闻
   * @private
   * @returns {Promise<NewsItem[]>} 处理后的新闻
   */
  async _fetchAndProcessNews() {
    return withRetry(
      async () => {
        const rawNews = await this.rssService.fetchNews();
        return this.newsProcessor.processNews(rawNews);
      },
      {
        maxAttempts: this.config.generation?.maxRetries || 3,
        shouldRetry: (error) => {
          return error.message.includes('network') ||
                 error.message.includes('timeout') ||
                 error.status >= 500;
        }
      },
      this.logger
    );
  }

  /**
   * 生成脚本
   * @private
   * @param {NewsItem[]} news - 新闻数据
   * @param {string} style - 风格
   * @returns {Promise<ScriptResult>} 脚本结果
   */
  async _generateScript(news, style) {
    const formattedNews = this.newsProcessor.formatNewsForScript(news);

    return withRetry(
      () => this.scriptService.generateScript(news, style),
      {
        maxAttempts: this.config.generation?.maxRetries || 3,
        initialDelay: 2000 // API调用稍长的延迟
      },
      this.logger
    );
  }

  /**
   * 生成语音
   * @private
   * @param {ScriptResult} scriptResult - 脚本结果
   * @param {string} style - 风格
   * @returns {Promise<VoiceResult>} 语音结果
   */
  async _generateVoice(scriptResult, style) {
    return withRetry(
      () => this.voiceService.generateAudio(scriptResult.content, style),
      {
        maxAttempts: this.config.generation?.maxRetries || 3,
        initialDelay: 5000, // 语音生成需要更长延迟
        maxDelay: 30000
      },
      this.logger
    );
  }

  /**
   * 存储文件
   * @private
   * @param {ScriptResult} scriptResult - 脚本结果
   * @param {VoiceResult} voiceResult - 语音结果
   * @param {string} episodeId - 剧集ID
   * @returns {Promise<StorageResult>} 存储结果
   */
  async _storeFiles(scriptResult, voiceResult, episodeId) {
    return withRetry(
      () => this.storageService.storeFiles(scriptResult, voiceResult),
      {
        maxAttempts: 3,
        initialDelay: 1000
      },
      this.logger
    );
  }

  /**
   * 生成剧集ID
   * @private
   * @param {string} style - 风格
   * @returns {string} 剧集ID
   */
  _generateEpisodeId(style) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const randomId = Math.random().toString(36).substring(2, 8);
    return `${style}-${timestamp}-${randomId}`;
  }

  /**
   * 构建结果对象
   * @private
   * @param {string} episodeId - 剧集ID
   * @param {NewsItem[]} news - 新闻数据
   * @param {ScriptResult} scriptResult - 脚本结果
   * @param {VoiceResult} voiceResult - 语音结果
   * @param {StorageResult} storageResult - 存储结果
   * @returns {PodcastResult} 播客结果
   */
  _buildResult(episodeId, news, scriptResult, voiceResult, storageResult) {
    return {
      episodeId,
      title: this._generateEpisodeTitle(news, scriptResult.style),
      description: this._generateEpisodeDescription(news),
      style: scriptResult.style,
      newsCount: news.length,
      wordCount: scriptResult.wordCount,
      duration: voiceResult.duration,
      fileSize: voiceResult.fileSize,
      scriptUrl: storageResult.scriptUrl,
      audioUrl: storageResult.audioUrl || null, // 异步时可能为null
      eventId: voiceResult.eventId || null, // 传递eventId
      isAsync: voiceResult.isAsync || false, // 传递异步标记
      generatedAt: new Date().toISOString(),
      metadata: {
        scriptMetadata: scriptResult.metadata,
        voiceMetadata: voiceResult.metadata,
        storageMetadata: storageResult.metadata
      }
    };
  }

  /**
   * 生成剧集标题
   * @private
   * @param {NewsItem[]} news - 新闻数据
   * @param {string} style - 风格
   * @returns {string} 剧集标题
   */
  _generateEpisodeTitle(news, style) {
    const styleNames = {
      'guo-de-gang': '郭德纲说新闻',
      'news-anchor': '今日热点播报'
    };

    const dateStr = new Date().toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric'
    });

    return `${styleNames[style] || '新闻播报'} - ${dateStr}`;
  }

  /**
   * 生成剧集描述
   * @private
   * @param {NewsItem[]} news - 新闻数据
   * @returns {string} 剧集描述
   */
  _generateEpisodeDescription(news) {
    if (news.length === 0) return '今日热点新闻播报';

    const topNews = news.slice(0, 3);
    const headlines = topNews.map(item => item.title).join('；');

    return `今日热点新闻：${headlines}${news.length > 3 ? '...' : ''}`;
  }

  /**
   * 获取生成统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      lastGenerated: null, // TODO: 从存储中获取
      totalEpisodes: 0,    // TODO: 从存储中获取
      totalDuration: 0,    // TODO: 从存储中获取
      stylesUsed: Object.keys(this.config.styles || {})
    };
  }
}

/**
 * 播客结果类型
 * @typedef {Object} PodcastResult
 * @property {string} episodeId - 剧集ID
 * @property {string} title - 剧集标题
 * @property {string} description - 剧集描述
 * @property {string} style - 播客风格
 * @property {number} newsCount - 新闻数量
 * @property {number} wordCount - 字数统计
 * @property {number} duration - 时长(秒)
 * @property {number} fileSize - 文件大小
 * @property {string} scriptUrl - 脚本URL
 * @property {string} audioUrl - 音频URL
 * @property {string} generatedAt - 生成时间
 * @property {Object} metadata - 元数据
 */
