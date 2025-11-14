/**
 * Kokoro-TTS 语音生成服务
 * 使用 Hugging Face Space 的 Kokoro-TTS 模型
 */

import { IVoiceService } from '../../../services/IVoiceService.js';
import { Logger } from '../../../utils/logger.js';
import { withRetry } from '../../../utils/retryUtils.js';
import { getFileSize } from '../../../utils/fileUtils.js';
import { KokoroTtsApiClient } from './KokoroTtsApiClient.js';

export class KokoroTtsVoiceService extends IVoiceService {
  constructor(config) {
    super();
    this.config = config || {};
    this.logger = new Logger('KokoroTtsVoiceService');

    // 初始化组件
    this.apiClient = new KokoroTtsApiClient();
    // 分块功能暂时禁用，用于性能测试
  }

  /**
   * 生成音频文件
   * @param {string} script - 脚本文本
   * @param {string} style - 语音风格 (映射到voice参数)
   * @returns {Promise<VoiceResult>} 音频生成结果
   */
  async generateAudio(script, style) {
    return withRetry(
      () => this._generateWithKokoroTTS(script, style),
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
   * 使用 Kokoro-TTS 生成音频（支持文本分块）
   */
  async _generateWithKokoroTTS(script, style) {
    this.logger.info('Starting Kokoro-TTS audio generation', {
      style,
      scriptLength: script ? script.length : 0
    });

    // 验证脚本内容
    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      this.logger.error('Invalid script provided', { style, script });
      throw new Error('Valid script text is required for audio generation');
    }

    // 映射风格到语音类型
    const voice = this._mapStyleToVoice(style);

    try {
      // 暂时回退到一次性生成，测试性能极限
      this.logger.info('Processing text as single chunk (testing performance limits)', {
        wordCount: script.split(/\s+/).filter(word => word.length > 0).length,
        charCount: script.length
      });

      return await this._generateSingleChunk(script, voice, style);

    } catch (error) {
      this.logger.error('Kokoro-TTS generation failed', {
        style,
        voice,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 生成单个音频块（短文本）
   */
  async _generateSingleChunk(script, voice, style) {
    const result = await this.apiClient.generateAudio(
      script,
      voice,
      this.config.speed || 1
    );

    const voiceResult = {
      audioData: result.audioData,
      format: result.format,
      duration: this._estimateDuration(script),
      fileSize: getFileSize(result.audioData),
      style,
      metadata: {
        provider: 'kokoro-tts',
        voice: voice,
        speed: this.config.speed || 1,
        apiMethod: 'HuggingFace Space',
        generatedAt: new Date().toISOString()
      }
    };

    this.logger.info('Single chunk audio generation completed', {
      style,
      voice,
      duration: voiceResult.duration,
      fileSize: voiceResult.fileSize
    });

    return voiceResult;
  }

  // 分块功能暂时禁用，用于性能测试
  // 如需启用，请取消注释相关代码

  /**
   * 将风格映射到语音类型
   * @param {string} style - 风格名称
   * @returns {string} 语音类型
   */
  _mapStyleToVoice(style) {
    // 根据风格映射到合适的语音
    // Kokoro-TTS 支持多种语音，这里提供一些映射
    const voiceMap = {
      'news': 'af_heart', // 新闻播报风格
      'story': 'af_heart', // 故事叙述
      'casual': 'af_heart', // 随意风格
      'formal': 'af_heart', // 正式风格
      'excited': 'af_heart', // 兴奋风格
      'calm': 'af_heart', // 平静风格
      // 可以添加更多映射
    };

    return voiceMap[style] || 'af_heart'; // 默认语音
  }

  /**
   * 估算音频时长 (基于字符数估算)
   * @param {string} script - 脚本文本
   * @returns {number} 估算时长(秒)
   */
  _estimateDuration(script) {
    // 简单估算：每分钟约150-200字，中等语速
    const wordsPerMinute = 180;
    const wordCount = script.split(/\s+/).length;
    return Math.ceil((wordCount / wordsPerMinute) * 60);
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    try {
      // 尝试获取可用语音来验证连接
      const voices = await this.apiClient.getAvailableVoices();
      if (voices && voices.length > 0) {
        this.logger.info('Kokoro-TTS service configuration validated successfully');
        return true;
      }
      throw new Error('No voices available');
    } catch (error) {
      this.logger.error('Kokoro-TTS configuration validation failed', error);
      return false;
    }
  }
}
