/**
 * 服务初始化器 - 负责创建和配置所有服务
 */

import { BbcRssService } from '../implementations/BbcRssService.js';
import { GeminiScriptService } from '../implementations/GeminiScriptService.js';
import { IndexTtsVoiceService } from '../implementations/IndexTtsVoiceService.js';
import { KokoroTtsVoiceService } from '../implementations/tts/KokoroTtsVoiceService.js';
import { E2F5TtsVoiceService } from '../implementations/tts/E2F5TtsVoiceService.js';
import { SubtitleGenerator } from '../implementations/SubtitleGenerator.js';
import { R2StorageService } from '../implementations/R2StorageService.js';
import { D1DatabaseService } from '../implementations/D1DatabaseService.js';
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

      // 创建各个服务实例
      this.services = {
      rssService: this._createRssService(env),
      scriptService: this._createScriptService(env),
      voiceService: this._createVoiceService(env),
      subtitleService: this._createSubtitleService(),
      storageService: this._createStorageService(env),
        database: this._createDatabaseService(env)
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
  * 创建脚本服务
  * @private
  * @param {Object} env - 环境变量和bindings
  * @returns {GeminiScriptService} 脚本服务实例
  */
  _createScriptService(env) {
  this.logger.info('Creating script service', {
  hasGeminiKey: !!env.GEMINI_API_KEY,
    geminiKeyLength: env.GEMINI_API_KEY ? env.GEMINI_API_KEY.length : 0
    });

    return new GeminiScriptService({
      apiKey: env.GEMINI_API_KEY
    });
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
          refAudioUrl: env.E2F5_REF_AUDIO_URL || 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/gdg.mp3',
          refText: env.E2F5_REF_TEXT || '找一个回酒店开房！',
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
