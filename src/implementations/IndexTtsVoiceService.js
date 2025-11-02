/**
 * IndexTTS语音生成服务实现
 */

import { IVoiceService } from '../services/IVoiceService.js';
import { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retryUtils.js';
import { getFileSize } from '../utils/fileUtils.js';

export class IndexTtsVoiceService extends IVoiceService {
  /**
   * 创建IndexTTS语音服务实例
   * @param {Object} config - 服务配置
   */
  constructor(config) {
    super();
    this.config = config;
    this.logger = new Logger('IndexTtsVoiceService');
    this.client = null;
  }

  /**
   * 生成音频文件
   * @param {string} script - 脚本文本
   * @param {string} style - 语音风格
   * @returns {Promise<VoiceResult>} 音频生成结果
   */
  async generateAudio(script, style) {
    return withRetry(
      () => this._generateWithIndexTTS(script, style),
      {
        maxAttempts: this.config.maxRetries || 3,
        initialDelay: 5000,
        maxDelay: 30000,
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
   * 使用IndexTTS生成音频
   * @private
   * @param {string} script - 脚本文本
   * @param {string} style - 语音风格
   * @returns {Promise<VoiceResult>} 语音结果
   */
  async _generateWithIndexTTS(script, style) {
    // 动态导入Gradio客户端
    const { Client } = await import('@gradio/client');

    if (!this.client) {
      this.client = await Client.connect(this.config.endpoint || 'Tom1986/indextts2');
    }

    // 获取风格配置
    const styleConfig = this._getStyleConfig(style);

    // 获取语音样本
    const voiceSample = await this._getVoiceSample(styleConfig.voiceSample);
    const emotionSample = await this._getEmotionSample(styleConfig.emotionSample);

    this.logger.info('Generating audio with IndexTTS', {
      style,
      scriptLength: script.length,
      endpoint: this.config.endpoint
    });

    try {
      // 准备音频数据
      const promptBlob = new Blob([voiceSample], { type: 'audio/wav' });
      const emoRefBlob = new Blob([emotionSample], { type: 'audio/wav' });

      // 调用IndexTTS API
      const result = await this.client.predict('/gen_single', {
        emo_control_method: 'Same as the voice reference',
        prompt: promptBlob,
        text: script,
        emo_ref_path: emoRefBlob,
        emo_weight: styleConfig.params?.emo_weight || 0.8,
        vec1: styleConfig.params?.vec1 || 0,  // Happy
        vec2: styleConfig.params?.vec2 || 0,  // Angry
        vec3: styleConfig.params?.vec3 || 0,  // Sad
        vec4: styleConfig.params?.vec4 || 0,  // Fear
        vec5: styleConfig.params?.vec5 || 0,  // Hate
        vec6: styleConfig.params?.vec6 || 0,  // Low
        vec7: styleConfig.params?.vec7 || 0,  // Surprise
        vec8: styleConfig.params?.vec8 || 0,  // Neutral
        emo_text: '',
        emo_random: false,
        max_text_tokens_per_sentence: 120,
        param_16: true,   // do_sample
        param_17: 0.8,    // top_p
        param_18: 30,     // top_k
        param_19: 0.8,    // temperature
        param_20: 0,      // length_penalty
        param_21: 3,      // num_beams
        param_22: 10,     // repetition_penalty
        param_23: 1500    // max_mel_tokens
      });

      // 处理返回的音频数据
      const audioData = await this._processAudioResult(result.data);

      const voiceResult = {
        audioData,
        format: 'mp3',
        duration: await this._estimateDuration(script),
        fileSize: getFileSize(audioData),
        style,
        metadata: {
          provider: 'indextts',
          endpoint: this.config.endpoint,
          styleConfig: styleConfig.name,
          parameters: {
            emo_weight: styleConfig.params?.emo_weight,
            emotion_vector: [styleConfig.params?.vec1, styleConfig.params?.vec2,
                           styleConfig.params?.vec3, styleConfig.params?.vec4,
                           styleConfig.params?.vec5, styleConfig.params?.vec6,
                           styleConfig.params?.vec7, styleConfig.params?.vec8]
          },
          generatedAt: new Date().toISOString()
        }
      };

      this.logger.info('Audio generated successfully', {
        style,
        duration: voiceResult.duration,
        fileSize: voiceResult.fileSize
      });

      return voiceResult;

    } catch (error) {
      this.logger.error('IndexTTS API call failed', {
        style,
        error: error.message,
        endpoint: this.config.endpoint
      });

      // 根据错误类型提供更具体的错误信息
      if (error.message.includes('connect')) {
        throw new Error('Failed to connect to IndexTTS service');
      } else if (error.message.includes('timeout')) {
        throw new Error('IndexTTS request timeout');
      } else if (error.status >= 500) {
        throw new Error('IndexTTS service error');
      }

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
    // 这里应该从配置服务获取，但暂时硬编码
    const styleConfigs = {
      'guo-de-gang': {
        name: '郭德纲相声风格',
        voiceSample: 'voices/guo-de-gang.wav',
        emotionSample: 'emotions/comedy.wav',
        params: {
          emo_weight: 0.9,
          vec1: 0.8,  // 高欢乐度
          vec7: 0.6   // 适度惊讶
        }
      },
      'news-anchor': {
        name: '专业新闻播报',
        voiceSample: 'voices/news-anchor.wav',
        emotionSample: 'emotions/professional.wav',
        params: {
          emo_weight: 0.3,
          vec8: 0.9   // 高中性度
        }
      }
    };

    const config = styleConfigs[style];
    if (!config) {
      throw new Error(`Unsupported style: ${style}`);
    }

    return config;
  }

  /**
   * 获取语音样本
   * @private
   * @param {string} samplePath - 样本路径
   * @returns {Promise<ArrayBuffer>} 语音样本数据
   */
  async _getVoiceSample(samplePath) {
    // 这里应该从R2或其他存储获取样本文件
    // 暂时使用模拟数据
    try {
      // 尝试从配置的存储服务获取
      if (this.config.storageService) {
        const sampleUrl = `${this.config.baseUrl || 'https://example.com'}/${samplePath}`;
        const response = await fetch(sampleUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch voice sample: ${response.status}`);
        }

        return await response.arrayBuffer();
      }

      // 如果没有配置，使用默认的示例音频
      throw new Error('Voice sample not configured');

    } catch (error) {
      this.logger.warn('Using default voice sample due to error', {
        samplePath,
        error: error.message
      });

      // 返回一个最小的WAV文件作为占位符
      // 实际项目中应该有默认的语音样本
      return this._createDummyAudio();
    }
  }

  /**
   * 获取情感样本
   * @private
   * @param {string} samplePath - 样本路径
   * @returns {Promise<ArrayBuffer>} 情感样本数据
   */
  async _getEmotionSample(samplePath) {
    // 类似语音样本的获取逻辑
    return this._getVoiceSample(samplePath);
  }

  /**
   * 处理音频结果
   * @private
   * @param {*} audioResult - API返回的音频数据
   * @returns {Buffer|Blob} 处理后的音频数据
   */
  async _processAudioResult(audioResult) {
    // 根据IndexTTS API的返回格式处理
    if (audioResult instanceof Blob) {
      return audioResult;
    }

    if (audioResult instanceof ArrayBuffer) {
      return Buffer.from(audioResult);
    }

    // 如果是文件路径或其他格式，需要额外处理
    if (typeof audioResult === 'string') {
      // 假设是文件URL
      const response = await fetch(audioResult);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio from URL: ${response.status}`);
      }
      return await response.blob();
    }

    throw new Error('Unsupported audio result format');
  }

  /**
   * 估算音频时长
   * @private
   * @param {string} script - 脚本文本
   * @returns {number} 估算时长(秒)
   */
  _estimateDuration(script) {
    // 简单估算：中文大约每分钟250字，英文每分钟150单词
    const chineseChars = (script.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = script.split(/\s+/).filter(word => word.length > 0).length;

    // 中文约200字/分钟，英文约150单词/分钟
    const chineseDuration = (chineseChars / 200) * 60;
    const englishDuration = (englishWords / 150) * 60;

    return Math.max(chineseDuration + englishDuration, 10); // 最少10秒
  }

  /**
   * 创建虚拟音频数据（用于测试）
   * @private
   * @returns {ArrayBuffer} 虚拟音频数据
   */
  _createDummyAudio() {
    // 创建一个最小的WAV文件头部
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    // WAV文件头部
    const header = 'RIFF\x00\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00';
    for (let i = 0; i < header.length; i++) {
      view.setUint8(i, header.charCodeAt(i));
    }

    return wavHeader;
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    try {
      if (!this.config.endpoint) {
        throw new Error('IndexTTS endpoint is required');
      }

      // 尝试连接到服务
      const { Client } = await import('@gradio/client');
      const client = await Client.connect(this.config.endpoint);

      // 尝试一个简单的调用来验证连接
      await client.predict('/on_method_select', {
        emo_control_method: 'Same as the voice reference'
      });

      this.logger.info('IndexTTS service configuration validated successfully');
      return true;

    } catch (error) {
      this.logger.error('IndexTTS service configuration validation failed', error);
      return false;
    }
  }

  /**
   * 获取支持的风格列表
   * @returns {string[]} 支持的风格
   */
  getSupportedStyles() {
    return ['guo-de-gang', 'news-anchor'];
  }

  /**
   * 获取API使用统计
   * @returns {Object} 统计信息
   */
  getUsageStats() {
    // TODO: 实现API使用统计
    return {
      totalRequests: 0,
      totalAudioGenerated: 0,
      averageGenerationTime: 0
    };
  }
}
