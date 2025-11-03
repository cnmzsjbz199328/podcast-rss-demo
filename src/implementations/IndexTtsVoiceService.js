/**
 * IndexTTS语音生成服务 - 重构后的简洁版本
 */

import { IVoiceService } from '../services/IVoiceService.js';
import { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retryUtils.js';
import { getFileSize } from '../utils/fileUtils.js';
import { IndexTtsApiClient } from './IndexTtsApiClient.js';
import { IndexTtsAudioProcessor } from './IndexTtsAudioProcessor.js';
import { IndexTtsStyleManager } from './IndexTtsStyleManager.js';

export class IndexTtsVoiceService extends IVoiceService {
  constructor(config) {
    super();
    this.config = config;
    this.logger = new Logger('IndexTtsVoiceService');

    // 初始化组件
    this.apiClient = new IndexTtsApiClient(config.endpoint);
    this.audioProcessor = new IndexTtsAudioProcessor();
    this.styleManager = new IndexTtsStyleManager();
  }

  /**
   * 生成音频文件
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
   */
  async _generateWithIndexTTS(script, style) {
    // 获取风格配置
    const styleConfig = this.styleManager.getStyleConfig(style);

    this.logger.info('Generating audio with IndexTTS', {
      style,
      scriptLength: script.length,
      endpoint: this.config.endpoint
    });

    try {
      // 获取语音样本
      const voiceBlob = await this._getVoiceSample(styleConfig.voiceSample);

      // 尝试获取情感样本
      let emotionBlob = null;
      if (styleConfig.emotionSample) {
        try {
          emotionBlob = await this._getEmotionSample(styleConfig.emotionSample);
        } catch (error) {
          this.logger.warn('Failed to load emotion sample, continuing without it', error);
        }
      }

      // 构建API参数
      const apiParams = {
        text: script,
        voiceBlob,
        emotionBlob,
        emoControlMethod: 'Same as the voice reference',
        emoWeight: styleConfig.params.emo_weight,
        emotionVector: [
          styleConfig.params.vec1,
          styleConfig.params.vec2,
          styleConfig.params.vec3,
          styleConfig.params.vec4,
          styleConfig.params.vec5,
          styleConfig.params.vec6,
          styleConfig.params.vec7,
          styleConfig.params.vec8
        ],
        emoText: '',
        emoRandom: false,
        maxTokens: 120,
        doSample: true,
        topP: 0.8,
        topK: 30,
        temperature: 0.8,
        lengthPenalty: 0,
        numBeams: 3,
        repetitionPenalty: 10,
        maxMelTokens: 1500
      };

      // 发送生成请求
      const result = await this.apiClient.sendGenerationRequest(apiParams);

      // 处理异步响应
      let audioData;
      let apiResult = result;
      let isAsync = false;

      if (result.event_id) {
        // 异步处理：创建错误音频作为占位符
        this.logger.warn('IndexTTS returned async processing result, creating placeholder audio');
        audioData = this.audioProcessor.createErrorAudio('语音合成服务使用异步处理，暂无法在Cloudflare Workers中完成');
        isAsync = true;
      } else {
        // 处理同步响应
        const processResult = await this.audioProcessor.processAudioResult(result);
        audioData = processResult.audioData;
        apiResult = processResult.apiResult;
      }

      // 构建返回结果
      const voiceResult = {
        audioData,
        format: 'wav',
        duration: this.audioProcessor.estimateDuration(script),
        fileSize: getFileSize(audioData),
        style,
        isAsync,
        eventId: result.event_id,
        metadata: {
          provider: 'indextts',
          endpoint: this.config.endpoint,
          styleConfig: styleConfig.name,
          apiMethod: isAsync ? 'HTTP Direct - Async' : 'HTTP Direct',
          eventId: result.event_id,
          generatedAt: new Date().toISOString()
        }
      };

      this.logger.info('Audio generation completed', {
        style,
        isAsync,
        duration: voiceResult.duration,
        fileSize: voiceResult.fileSize
      });

      return voiceResult;

    } catch (error) {
      this.logger.error('IndexTTS generation failed', {
        style,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 轮询异步结果
   */
  async pollAudioResult(eventId) {
    return await this.apiClient.pollAsyncResult(eventId);
  }

  /**
   * 获取语音样本
   */
  async _getVoiceSample(samplePath) {
    try {
      if (samplePath.startsWith('http')) {
        const response = await fetch(samplePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch voice sample: ${response.status}`);
        }
        return await response.blob();
      }
      throw new Error('Voice sample not configured');
    } catch (error) {
      this.logger.warn('Using default voice sample due to error', error);
      return this.audioProcessor.createErrorAudio('Voice sample unavailable');
    }
  }

  /**
   * 获取情感样本
   */
  async _getEmotionSample(samplePath) {
    return await this._getVoiceSample(samplePath);
  }

  /**
   * 验证服务配置
   */
  async validateConfig() {
    try {
      if (!this.config.endpoint) {
        throw new Error('IndexTTS endpoint is required');
      }

      // 尝试获取API信息来验证连接
      const infoResponse = await fetch(`${this.config.endpoint}/gradio_api/info`);
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        if (info.named_endpoints && info.named_endpoints['/gen_single']) {
          this.logger.info('IndexTTS service configuration validated successfully');
          return true;
        }
      }

      throw new Error('IndexTTS service not accessible');

    } catch (error) {
      this.logger.error('IndexTTS configuration validation failed', error);
      return false;
    }
  }
}
