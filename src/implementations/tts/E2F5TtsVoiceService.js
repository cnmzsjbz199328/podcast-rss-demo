/**
 * E2-F5-TTS 语音生成服务
 * 使用 Hugging Face Space 的 E2-F5-TTS 模型
 */

import { IVoiceService } from '../../services/IVoiceService.js';
import { Logger } from '../../utils/logger.js';
import { withRetry } from '../../utils/retryUtils.js';
import { getFileSize } from '../../utils/fileUtils.js';
import { E2F5TtsApiClient } from './E2F5TtsApiClient.js';

export class E2F5TtsVoiceService extends IVoiceService {
  constructor(config) {
    super();
    this.config = config || {};
    this.logger = new Logger('E2F5TtsVoiceService');

    // 初始化组件
    this.apiClient = new E2F5TtsApiClient({
      refAudioUrl: this.config.refAudioUrl || "https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/gdg.mp3",
      refText: this.config.refText || "找一个回酒店开房！",
      removeSilence: this.config.removeSilence !== false
    });
  }

  /**
   * 生成音频文件
   * @param {string} script - 脚本文本
   * @param {string} style - 语音风格 (对E2-F5-TTS影响不大)
   * @returns {Promise<VoiceResult>} 音频生成结果
   */
  async generateAudio(script, style) {
    return withRetry(
      () => this._generateWithE2F5TTS(script, style),
      {
        maxAttempts: this.config.maxRetries || 3,
        initialDelay: 2000,
        maxDelay: 10000,
        shouldRetry: (error) => {
          return error.message.includes('network') ||
                 error.message.includes('timeout') ||
                 error.message.includes('fetch');
        }
      },
      this.logger
    );
  }

  /**
   * 使用 E2-F5-TTS 生成音频
   */
  async _generateWithE2F5TTS(script, style) {
    this.logger.info('Starting E2-F5-TTS audio generation', {
      style,
      scriptLength: script ? script.length : 0
    });

    // 验证脚本内容
    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      this.logger.error('Invalid script provided', { style, script });
      throw new Error('Valid script text is required for audio generation');
    }

    try {
      this.logger.info('Processing text with E2-F5-TTS', {
        wordCount: script.split(/\s+/).filter(word => word.length > 0).length,
        charCount: script.length
      });

      return await this._generateSingleChunk(script, style);

    } catch (error) {
      this.logger.error('E2-F5-TTS generation failed', {
        style,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 生成单个音频块
   */
  async _generateSingleChunk(script, style) {
    const result = await this.apiClient.generateAudio(script);

    const voiceResult = {
      audioData: result.audioData,
      format: result.format,
      duration: this._estimateDuration(script),
      fileSize: getFileSize(result.audioData),
      style,
      metadata: {
        provider: 'e2-f5-tts',
        refAudioUrl: this.config.refAudioUrl || "https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/gdg.mp3",
        refText: this.config.refText || "找一个回酒店开房！",
        removeSilence: this.config.removeSilence !== false,
        apiMethod: 'HuggingFace Space',
        generatedAt: new Date().toISOString()
      }
    };

    this.logger.info('E2-F5-TTS audio generation completed', {
      style,
      duration: voiceResult.duration,
      fileSize: voiceResult.fileSize
    });

    return voiceResult;
  }

  /**
   * 估算音频时长 (基于字符数估算，支持中文)
   * @param {string} script - 脚本文本
   * @returns {number} 估算时长(秒)
   */
  _estimateDuration(script) {
    if (!script) return 1;

    // 检测是否包含中文字符
    const hasChinese = /[\u4e00-\u9fff]/.test(script);

    if (hasChinese) {
      // 中文估算：每分钟约300-400字符
      const charsPerMinute = 350;
      const charCount = script.length;
      return Math.ceil((charCount / charsPerMinute) * 60);
    } else {
      // 英文估算：每分钟约150-200字
      const wordsPerMinute = 180;
      const wordCount = script.split(/\s+/).length;
      return Math.ceil((wordCount / wordsPerMinute) * 60);
    }
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    try {
      // 尝试生成一个短音频来验证连接
      const testResult = await this.generateAudio("Hello world", "test");
      if (testResult && testResult.audioData) {
        this.logger.info('E2-F5-TTS service configuration validated successfully');
        return true;
      }
      throw new Error('Test generation failed');
    } catch (error) {
      this.logger.error('E2-F5-TTS configuration validation failed', error);
      return false;
    }
  }
}
