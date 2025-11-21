/**
 * 服务初始化器 - 负责创建和配置所有服务
 */

import { BbcRssService } from '../implementations/BbcRssService.js';
import { FallbackScriptService } from '../implementations/ai/FallbackScriptService.js';
import { IndexTtsVoiceService } from '../implementations/tts/index/IndexTtsVoiceService.js';
import { KokoroTtsVoiceService } from '../implementations/tts/kokoro/KokoroTtsVoiceService.js';
import { E2F5TtsVoiceService } from '../implementations/tts/e2f5/E2F5TtsVoiceService.js';
import { AsyncStreamingTtsService } from '../implementations/tts/AsyncStreamingTtsService.js';
import { SubtitleGenerator } from '../implementations/SubtitleGenerator.js';
import { R2StorageService } from '../implementations/R2StorageService.js';
import { D1DatabaseService } from '../implementations/D1DatabaseService.js';

// 新的仓库和服务
import { TopicRepository } from '../repositories/TopicRepository.js';
import { TopicPodcastRepository } from '../repositories/TopicPodcastRepository.js';
import { NewsPodcastService } from '../core/NewsPodcastService.js';
import { TopicPodcastService } from '../core/TopicPodcastService.js';
import { TopicSeriesGenerator } from '../core/TopicSeriesGenerator.js';

import { Logger } from '../utils/logger.js';

export class ServiceInitializer {
  constructor() {
    this.logger = new Logger('ServiceInitializer');
    this.services = null;
  }

  /**
  * 获取或创建服务实例
  * @param {Object} env - 环境变量和bindings
  * @returns {Object} 服务实例
  */
  getServices(env) {
  if (!this.services) {
  this.logger.info('Initializing services with R2 and D1 bindings');

  // 第一阶段：创建技术服务
  const databaseService = this._createDatabaseService(env);

  const techServices = {
  rssService: this._createRssService(env),
  scriptService: this._createScriptService(env),
  voiceService: this._createVoiceService(env),
  asyncVoiceService: this._createAsyncVoiceService(env),
  subtitleService: this._createSubtitleService(),
  storageService: this._createStorageService(env),
  database: databaseService
  };

  // 第二阶段：创建仓库层
  const repositories = {
  topicRepository: this._createTopicRepository(databaseService),
        topicPodcastRepository: this._createTopicPodcastRepository(databaseService)
  };

  // 第三阶段：创建业务服务
  const allServices = { ...techServices, ...repositories };

  const businessServices = {
  newsPodcastService: this._createNewsPodcastService(allServices),
  topicPodcastService: this._createTopicPodcastService(allServices),
    topicSeriesGenerator: this._createTopicSeriesGenerator(allServices)
     };

  // 合并所有服务
  this.services = {
  ...techServices,
  ...repositories,
    ...businessServices
      };

      this.logger.info('Services initialized successfully');
    }

    return this.services;
  }

  /**
   * 创建RSS服务
   * @private
   * @param {Object} env - 环境变量
   * @returns {BbcRssService} RSS服务实例
   */
  _createRssService(env) {
    return new BbcRssService({
      url: env.BBC_RSS_URL || 'https://feeds.bbci.co.uk/news/rss.xml'
    });
  }

  /**
  * 创建脚本服务 - 支持Gemini和Cohere回退
  * @private
  * @param {Object} env - 环境变量和bindings
  * @returns {FallbackScriptService} 脚本服务实例
  */
  _createScriptService(env) {
  this.logger.info('Creating script service with fallback support', {
  hasGeminiKey: !!env.GEMINI_API_KEY,
  geminiKeyLength: env.GEMINI_API_KEY ? env.GEMINI_API_KEY.length : 0,
  hasCohereKey: !!env.COHERE_API_KEY,
    cohereKeyLength: env.COHERE_API_KEY ? env.COHERE_API_KEY.length : 0
  });

  const geminiConfig = {
      apiKey: env.GEMINI_API_KEY
    };

    const cohereConfig = env.COHERE_API_KEY ? {
      apiKey: env.COHERE_API_KEY
    } : null;

    return new FallbackScriptService(geminiConfig, cohereConfig);
  }

  /**
  * 创建语音服务
  * @private
  * @param {Object} env - 环境变量
  * @returns {IVoiceService} 语音服务实例
  */
  _createVoiceService(env) {
  const ttsProvider = env.TTS_PROVIDER || 'kokoro'; // 默认使用 Kokoro-TTS

  this.logger.info('Creating voice service', { provider: ttsProvider });

  switch (ttsProvider.toLowerCase()) {
  case 'indextts':
  case 'tts2':
  return new IndexTtsVoiceService({
  endpoint: env.INDEXTTS_ENDPOINT || 'https://indexteam-indextts-2-demo.hf.space'
  });

  case 'e2f5':
  return new E2F5TtsVoiceService({
  refAudioUrl: env.E2F5_REF_AUDIO_URL,
  refText: env.E2F5_REF_TEXT,
  removeSilence: env.E2F5_REMOVE_SILENCE !== 'false',
  maxRetries: env.TTS_MAX_RETRIES ? parseInt(env.TTS_MAX_RETRIES) : 3
  });

  case 'kokoro':
  default:
  return new KokoroTtsVoiceService({
  speed: env.KOKORO_SPEED ? parseFloat(env.KOKORO_SPEED) : 1,
  maxRetries: env.TTS_MAX_RETRIES ? parseInt(env.TTS_MAX_RETRIES) : 3
  });
  }
  }

  /**
   * 创建异步语音服务
   * @private
   * @param {Object} env - 环境变量
   * @returns {AsyncStreamingTtsService} 异步语音服务实例
   */
  _createAsyncVoiceService(env) {
    this.logger.info('Creating async voice service');

    return new AsyncStreamingTtsService({
      speed: env.KOKORO_SPEED ? parseFloat(env.KOKORO_SPEED) : 1
    }, env);
  }

  /**
   * 创建存储服务
   * @private
   * @param {Object} env - 环境变量
   * @returns {R2StorageService} 存储服务实例
   */
  _createStorageService(env) {
    return new R2StorageService(env.PODCAST_BUCKET, env.R2_BASE_URL);
  }

  /**
  * 创建字幕服务
  * @private
  * @returns {SubtitleGenerator} 字幕服务实例
  */
  _createSubtitleService() {
    return new SubtitleGenerator();
  }

  /**
  * 创建数据库服务
  * @private
  * @param {Object} env - 环境变量
  * @returns {D1DatabaseService} 数据库服务实例
  */
  _createDatabaseService(env) {
  return new D1DatabaseService(env.DB);
  }

  /**
  * 创建主题仓库
  * @private
   * @param {D1DatabaseService} databaseService - 数据库服务
  * @returns {TopicRepository} 主题仓库实例
  */
  _createTopicRepository(databaseService) {
    return new TopicRepository(databaseService.db);
  }

  /**
   * 创建主题播客仓库
   * @private
   * @param {D1DatabaseService} databaseService - 数据库服务
   * @returns {TopicPodcastRepository} 主题播客仓库实例
   */
  _createTopicPodcastRepository(databaseService) {
    return new TopicPodcastRepository(databaseService.db);
  }

  /**
   * 创建新闻播客业务服务
   * @private
   * @param {Object} services - 技术服务集合
   * @returns {NewsPodcastService} 新闻播客服务实例
   */
  _createNewsPodcastService(services) {
    return new NewsPodcastService(services, {
      maxRetries: 3,
      retryDelay: 1000
    });
  }

  /**
  * 创建主题播客业务服务
  * @private
  * @param {Object} services - 技术服务集合
  * @returns {TopicPodcastService} 主题播客服务实例
  */
  _createTopicPodcastService(services) {
  return new TopicPodcastService(
  services,
  services.topicRepository,
  services.topicPodcastRepository,
  {
  maxRetries: 3,
  retryDelay: 1000
  }
  );
  }

  /**
   * 创建主题系列生成器
   * @private
   * @param {Object} services - 技术服务集合
   * @returns {TopicSeriesGenerator} 主题系列生成器实例
   */
  _createTopicSeriesGenerator(services) {
    return new TopicSeriesGenerator(
      services.topicRepository,
      services.topicPodcastRepository,
      services.scriptService
    );
  }

  /**
   * 重置服务实例（用于测试）
   */
  reset() {
    this.services = null;
    this.logger.info('Services reset');
  }
}

// 创建全局实例
const serviceInitializer = new ServiceInitializer();

export { serviceInitializer };
