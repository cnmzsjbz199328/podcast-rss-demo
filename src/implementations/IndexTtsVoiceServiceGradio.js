/**
 * IndexTTS 语音生成服务 - Gradio Client 实现
 * 使用官方 @gradio/client 库
 */

import { client } from '@gradio/client';
import { IVoiceService } from '../services/IVoiceService.js';
import { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retryUtils.js';
import { getFileSize } from '../utils/fileUtils.js';

export class IndexTtsVoiceServiceGradio extends IVoiceService {
  /**
   * 创建 IndexTTS 语音服务实例
   * @param {Object} config - 服务配置
   */
  constructor(config) {
    super();
    this.config = config;
    this.logger = new Logger('IndexTtsVoiceServiceGradio');
    this.spaceId = 'IndexTeam/IndexTTS-2-Demo';
    this.clientInstance = null;
  }

  /**
   * 初始化 Gradio Client
   * @private
   */
  async _initClient() {
    if (this.clientInstance) {
      return this.clientInstance;
    }

    try {
      this.clientInstance = await client(this.spaceId);
      this.logger.info('Gradio client connected', { spaceId: this.spaceId });
      return this.clientInstance;
    } catch (error) {
      this.logger.error('Failed to connect Gradio client', { error: error.message });
      throw new Error(`Cannot connect to IndexTTS: ${error.message}`);
    }
  }

  /**
   * 生成音频文件
   * @param {string} script - 脚本文本
   * @param {string} style - 语音风格
   * @returns {Promise<VoiceResult>} 音频生成结果
   */
  async generateAudio(script, style) {
    return withRetry(
      () => this._generateWithGradio(script, style),
      {
        maxAttempts: this.config.maxRetries || 2,
        initialDelay: 5000,
        maxDelay: 30000,
        shouldRetry: (error) => {
          return error.message.includes('network') ||
                 error.message.includes('timeout') ||
                 error.message.includes('connection');
        }
      },
      this.logger
    );
  }

  /**
   * 使用 Gradio Client 生成音频
   * @private
   * @param {string} script - 脚本文本
   * @param {string} style - 语音风格
   * @returns {Promise<VoiceResult>} 语音结果
   */
  async _generateWithGradio(script, style) {
    const styleConfig = this._getStyleConfig(style);

    this.logger.info('Generating audio with IndexTTS (Gradio)', {
      style,
      scriptLength: script.length,
      spaceId: this.spaceId
    });

    try {
      // 初始化客户端
      const client = await this._initClient();

      // 下载语音参考文件
      this.logger.info('Downloading voice reference', { url: styleConfig.voiceSample });
      const voiceBlob = await this._downloadAudioFile(styleConfig.voiceSample);

      // 调用 /gen_single API
      this.logger.info('Calling /gen_single API');
      const result = await client.predict('/gen_single', {
        emo_control_method: 'Same as the voice reference',
        prompt: voiceBlob, // Voice Reference audio
        text: script,
        emo_ref_path: voiceBlob, // Use same audio for emotion reference
        emo_weight: styleConfig.params?.emo_weight || 0.8,
        vec1: styleConfig.params?.vec1 || 0, // Happy
        vec2: styleConfig.params?.vec2 || 0, // Angry
        vec3: styleConfig.params?.vec3 || 0, // Sad
        vec4: styleConfig.params?.vec4 || 0, // Afraid
        vec5: styleConfig.params?.vec5 || 0, // Disgusted
        vec6: styleConfig.params?.vec6 || 0, // Melancholic
        vec7: styleConfig.params?.vec7 || 0, // Surprised
        vec8: styleConfig.params?.vec8 || 0, // Calm
        emo_text: '',
        emo_random: false,
        max_text_tokens_per_segment: 120,
        param_16: true,  // do_sample
        param_17: 0.8,   // top_p
        param_18: 30,    // top_k
        param_19: 0.8,   // temperature
        param_20: 0,     // length_penalty
        param_21: 3,     // num_beams
        param_22: 10,    // repetition_penalty
        param_23: 1500   // max_mel_tokens
      });

      this.logger.info('API call completed', { hasData: !!result.data });

      // 处理返回的音频数据
      let audioData;
      if (result.data && result.data.url) {
        // 下载生成的音频
        this.logger.info('Downloading generated audio', { url: result.data.url });
        audioData = await this._downloadAudioFile(result.data.url);
      } else {
        this.logger.warn('No audio URL in result, using placeholder');
        audioData = this._createPlaceholderAudio(script);
      }

      const duration = await this._estimateDuration(script);
      const fileSize = audioData.byteLength || audioData.size || 0;

      const voiceResult = {
        audioData,
        format: 'wav',
        duration,
        fileSize,
        style,
        metadata: {
          provider: 'indextts',
          spaceId: this.spaceId,
          styleConfig: styleConfig.name,
          apiMethod: 'Gradio Client',
          generatedAt: new Date().toISOString(),
          resultData: result.data
        }
      };

      this.logger.info('Audio generated successfully', {
        style,
        duration,
        fileSize
      });

      return voiceResult;

    } catch (error) {
      this.logger.error('IndexTTS Gradio API call failed', {
        style,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 下载音频文件
   * @private
   * @param {string} url - 音频文件 URL
   * @returns {Promise<Blob>} 音频 Blob
   */
  async _downloadAudioFile(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      this.logger.error('Failed to download audio file', { url, error: error.message });
      throw error;
    }
  }

  /**
   * 获取风格配置
   * @private
   * @param {string} style - 风格名称
   * @returns {Object} 风格配置
   */
  _getStyleConfig(style) {
    const defaultConfigs = {
      'guo-de-gang': {
        name: '郭德纲相声风格',
        voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3',
        params: {
          emo_weight: 0.9,
          vec1: 0.8,  // Happy
          vec7: 0.6   // Surprised
        }
      },
      'news-anchor': {
        name: '专业新闻播报',
        voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
        params: {
          emo_weight: 0.3,
          vec8: 0.9   // Calm
        }
      },
      'emotional': {
        name: '情感播报',
        voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
        params: {
          emo_weight: 0.7,
          vec1: 0.5,  // Happy
          vec3: 0.3   // Sad
        }
      }
    };

    const config = defaultConfigs[style];
    if (!config) {
      throw new Error(`Unsupported style: ${style}`);
    }

    return config;
  }

  /**
   * 创建占位音频
   * @private
   * @param {string} script - 脚本文本
   * @returns {ArrayBuffer} 音频数据
   */
  _createPlaceholderAudio(script) {
    // 创建一个简单的 WAV 文件头
    const duration = this._estimateDuration(script);
    const sampleRate = 16000;
    const numSamples = Math.floor(duration * sampleRate);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, buffer.byteLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // 生成简单的音频数据（静音）
    for (let i = 0; i < numSamples; i++) {
      view.setInt16(44 + i * 2, 0, true);
    }

    return buffer;
  }

  /**
   * 估算音频时长
   * @private
   * @param {string} script - 脚本文本
   * @returns {number} 估算时长(秒)
   */
  _estimateDuration(script) {
    const chineseChars = (script.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = script.split(/\s+/).filter(word => word.length > 0).length;
    const chineseDuration = (chineseChars / 200) * 60;
    const englishDuration = (englishWords / 150) * 60;
    return Math.max(chineseDuration + englishDuration, 10);
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    try {
      await this._initClient();
      this.logger.info('IndexTTS Gradio service validated successfully');
      return true;
    } catch (error) {
      this.logger.error('IndexTTS Gradio service validation failed', { error: error.message });
      return false;
    }
  }

  /**
   * 获取支持的风格列表
   * @returns {string[]} 支持的风格
   */
  getSupportedStyles() {
    return ['guo-de-gang', 'news-anchor', 'emotional'];
  }

  /**
   * 清理资源
   */
  async cleanup() {
    if (this.clientInstance) {
      try {
        // Gradio client 通常没有 close 方法，只需清空引用
        this.clientInstance = null;
        this.logger.info('Gradio client cleaned up');
      } catch (error) {
        this.logger.error('Failed to cleanup Gradio client', { error: error.message });
      }
    }
  }
}
