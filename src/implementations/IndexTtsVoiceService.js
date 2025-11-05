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
    this.logger.info('Starting IndexTTS audio generation', {
      style,
      scriptLength: script ? script.length : 0,
      endpoint: this.config.endpoint
    });

    // 验证脚本内容
    if (!script) {
      this.logger.error('Script is null or undefined', { style });
      throw new Error('Script is null or undefined - cannot generate audio');
    }

    if (typeof script !== 'string') {
      this.logger.error('Script is not a string', {
        style,
        scriptType: typeof script,
        scriptValue: script
      });
      throw new Error(`Script must be a string, got ${typeof script}`);
    }

    if (script.length === 0) {
      this.logger.error('Script is empty string', { style });
      throw new Error('Empty script provided to IndexTTS');
    }

    if (script.trim().length === 0) {
      this.logger.error('Script contains only whitespace', { style, script });
      throw new Error('Script contains only whitespace - cannot generate audio');
    }

    this.logger.info('Script validation passed', {
      style,
      scriptLength: script.length,
      trimmedLength: script.trim().length,
      scriptPreview: script.substring(0, 100) + '...'
    });

    if (script.length > 10000) {
      this.logger.warn('Script is very long, may cause issues', { length: script.length });
    }

    // 获取风格配置
    const styleConfig = this.styleManager.getStyleConfig(style);
    this.logger.debug('Style configuration loaded', {
      styleName: styleConfig.name,
      hasVoiceSample: !!styleConfig.voiceSample
    });

    try {
      // 获取语音样本URL
      const voiceUrlObj = await this._getVoiceSample(styleConfig.voiceSample);

      // 尝试获取情感样本URL
      let emotionUrlObj = null;
      if (styleConfig.emotionSample) {
        try {
          emotionUrlObj = await this._getEmotionSample(styleConfig.emotionSample);
        } catch (error) {
          this.logger.warn('Failed to load emotion sample, continuing without it', error);
        }
      }

      // 构建API参数
      const apiParams = {
        text: script,
        voiceBlob: voiceUrlObj,       // 传递URL对象
        emotionBlob: emotionUrlObj,   // 传递URL对象
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

      // IndexTTS 返回 event_id 表示异步处理
      if (!result.event_id) {
        // 同步响应（罕见情况）
        const processResult = await this.audioProcessor.processAudioResult(result);
        return {
          audioData: processResult.audioData,
          format: 'wav',
          duration: this.audioProcessor.estimateDuration(script),
          fileSize: getFileSize(processResult.audioData),
          style,
          metadata: {
            provider: 'indextts',
            endpoint: this.config.endpoint,
            styleConfig: styleConfig.name,
            apiMethod: 'HTTP Direct - Sync',
            generatedAt: new Date().toISOString()
          }
        };
      }

      // 异步处理：立即轮询等待结果（SSE 是一次性的，必须立即读取）
      this.logger.info('IndexTTS returned event_id, polling for result immediately', {
        eventId: result.event_id
      });

      // 立即连接 SSE（不等待，因为 Gradio SSE 需要持续连接）
      const pollResult = await this.apiClient.pollAsyncResult(result.event_id, 0);
      
      if (pollResult.status !== 'completed') {
        const errMsg = pollResult.error || pollResult.message || 'Unknown error';
        this.logger.error('Poll result not completed', { pollResult });
        throw new Error(`Audio generation failed: ${errMsg} | pollResult=${JSON.stringify(pollResult)}`);
      }

      // pollResult 已经包含 audioData
      const voiceResult = {
        audioData: pollResult.audioData,
        format: 'wav',
        duration: this.audioProcessor.estimateDuration(script),
        fileSize: pollResult.fileSize,
        style,
        metadata: {
          provider: 'indextts',
          endpoint: this.config.endpoint,
          styleConfig: styleConfig.name,
          apiMethod: 'HTTP Direct with SSE',
          eventId: result.event_id,
          generatedAt: new Date().toISOString()
        }
      };

      this.logger.info('Audio generation completed', {
        style,
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
   * 获取语音样本 - 返回URL对象供Gradio API使用
   */
  async _getVoiceSample(samplePath) {
    try {
      if (samplePath.startsWith('http')) {
        // 验证URL可访问性
        const response = await fetch(samplePath, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`Failed to fetch voice sample: ${response.status}`);
        }
        // 返回URL对象，供Gradio API使用
        return { url: samplePath };
      }
      throw new Error('Voice sample not configured');
    } catch (error) {
      this.logger.warn('Voice sample error, using default', error);
      // 返回默认URL
      return { url: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/news-anchor.mp3' };
    }
  }

  /**
   * 获取情感样本 - 返回URL对象供Gradio API使用
   */
  async _getEmotionSample(samplePath) {
    try {
      if (samplePath && samplePath.startsWith('http')) {
        const response = await fetch(samplePath, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`Failed to fetch emotion sample: ${response.status}`);
        }
        return { url: samplePath };
      }
      return null;
    } catch (error) {
      this.logger.warn('Emotion sample error, skipping', error);
      return null;
    }
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
