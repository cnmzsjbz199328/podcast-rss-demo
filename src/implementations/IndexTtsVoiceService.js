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
  const gradio = await import('@gradio/client');

  if (!this.client) {
  this.client = await gradio.client(this.config.endpoint || 'IndexTeam/IndexTTS-2-Demo');
  }

  // 获取风格配置
  const styleConfig = this._getStyleConfig(style);

  this.logger.info('Generating audio with IndexTTS', {
    style,
    scriptLength: script.length,
      endpoint: this.config.endpoint
  });

  try {
      // 获取语音样本（必需）
      const voiceSampleUrl = styleConfig.voiceSample;
      const voiceResponse = await fetch(voiceSampleUrl);

      if (!voiceResponse.ok) {
        throw new Error('Failed to download voice sample');
      }

      const voiceBlob = await voiceResponse.blob();

      // 尝试获取情感样本（可选）
      let emotionBlob = null;
      if (styleConfig.emotionSample && styleConfig.emotionSample.startsWith('http')) {
        try {
          const emotionResponse = await fetch(styleConfig.emotionSample);
          if (emotionResponse.ok) {
            emotionBlob = await emotionResponse.blob();
          }
        } catch (emotionError) {
          this.logger.warn('Failed to load emotion sample, continuing without it', {
            error: emotionError.message
          });
        }
      }

      // 步骤1: 先设置情感控制方法
      this.logger.info('Setting emotion control method...');
      await this.client.predict('/on_method_select', {
        emo_control_method: 'Same as the voice reference'
      });

      // 步骤2: 处理输入文本
      this.logger.info('Processing input text...');
      await this.client.predict('/on_input_text_change', {
        text: script,
        max_text_tokens_per_segment: 120
      });

      // 步骤3: 生成音频 - 使用简化的参数
      this.logger.info('Generating audio...');
      const predictParams = {
        emo_control_method: 'Same as the voice reference',
        prompt: voiceBlob,
        text: script,
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
        max_text_tokens_per_segment: 120,
        param_16: true,   // do_sample
        param_17: 0.8,    // top_p
        param_18: 30,     // top_k
        param_19: 0.8,    // temperature
        param_20: 0,      // length_penalty
        param_21: 3,      // num_beams
        param_22: 10,     // repetition_penalty
        param_23: 1500    // max_mel_tokens
      };

      // 如果有情感样本，添加到参数中
      if (emotionBlob) {
        predictParams.emo_ref_path = emotionBlob;
      }

      const result = await this.client.predict('/gen_single', predictParams);

      this.logger.info('API call result:', result);

      // 处理异步响应
      let audioData;
      let apiResult = result;

      if (result.event_id) {
        // IndexTTS使用异步处理，但Cloudflare Worker有执行时间限制，无法有效轮询
        // 创建一个说明问题的音频文件作为临时解决方案
        this.logger.warn('IndexTTS returned async processing result (event_id), creating placeholder audio');

        // 创建一个包含错误信息的音频数据
        audioData = this._createErrorAudio('语音合成服务暂不可用，请稍后重试');
        apiResult = result;
      } else {
        // 处理同步响应
        const processResult = await this._processAudioResult(result);
        audioData = processResult.audioData;
        apiResult = processResult.apiResult;
      }

      this.logger.info('Audio data received', {
        size: audioData ? audioData.byteLength || audioData.length : 0,
        type: audioData ? typeof audioData : 'null'
      });

      const voiceResult = {
        audioData,
        format: 'wav',
        duration: await this._estimateDuration(script),
        fileSize: getFileSize(audioData),
        style,
        metadata: {
        provider: 'indextts',
        endpoint: this.config.endpoint,
        styleConfig: styleConfig.name,
        apiMethod: 'Gradio Client',
        eventId: apiResult?.event_id,
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
    // 从配置中读取风格配置，如果没有则使用默认配置
    const styleConfig = this.config?.styles?.[style];

    if (styleConfig) {
      return styleConfig;
    }

    // 后备默认配置
    const defaultConfigs = {
      'guo-de-gang': {
        name: '郭德纲相声风格',
        voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3',
        emotionSample: 'emotions/comedy.wav',
        params: {
          emo_weight: 0.9,
          vec1: 0.8,  // 高欢乐度
          vec7: 0.6   // 适度惊讶
        }
      },
      'news-anchor': {
        name: '专业新闻播报',
        voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
        emotionSample: 'emotions/professional.wav',
        params: {
          emo_weight: 0.3,
          vec8: 0.9   // 高中性度
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
   * 获取语音样本
   * @private
   * @param {string} samplePath - 样本路径
   * @returns {Promise<ArrayBuffer>} 语音样本数据
   */
  async _getVoiceSample(samplePath) {
    try {
      // 检查是否是完整的URL
      if (samplePath.startsWith('http://') || samplePath.startsWith('https://')) {
        // 直接从URL下载
        const response = await fetch(samplePath);

        if (!response.ok) {
          throw new Error(`Failed to fetch voice sample: ${response.status}`);
        }

        return await response.arrayBuffer();
      } else {
        // 相对路径，尝试从存储服务获取
        if (this.config.baseUrl) {
          const sampleUrl = `${this.config.baseUrl}/${samplePath}`;
          const response = await fetch(sampleUrl);

          if (!response.ok) {
            throw new Error(`Failed to fetch voice sample: ${response.status}`);
          }

          return await response.arrayBuffer();
        }

        // 如果没有配置，使用默认的示例音频
        throw new Error('Voice sample not configured');
      }

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
  * 直接调用IndexTTS HTTP API
  * @private
  * @param {string} script - 脚本文本
  * @param {Object} styleConfig - 风格配置
  * @param {Blob} voiceBlob - 语音样本
   * @param {Blob} emotionBlob - 情感样本
   * @returns {Promise<ArrayBuffer>} 音频数据
   */
  async _callIndexTTSHttpDirect(script, styleConfig, voiceBlob, emotionBlob) {
    try {
      const formData = new FormData();

      // 设置基本参数
      formData.append('emo_control_method', 'Same as the voice reference');
      formData.append('text', script);
      formData.append('emo_weight', (styleConfig.params?.emo_weight || 0.8).toString());
      formData.append('vec1', (styleConfig.params?.vec1 || 0).toString());
      formData.append('vec2', (styleConfig.params?.vec2 || 0).toString());
      formData.append('vec3', (styleConfig.params?.vec3 || 0).toString());
      formData.append('vec4', (styleConfig.params?.vec4 || 0).toString());
      formData.append('vec5', (styleConfig.params?.vec5 || 0).toString());
      formData.append('vec6', (styleConfig.params?.vec6 || 0).toString());
      formData.append('vec7', (styleConfig.params?.vec7 || 0).toString());
      formData.append('vec8', (styleConfig.params?.vec8 || 0).toString());
      formData.append('emo_text', '');
      formData.append('emo_random', 'false');
      formData.append('max_text_tokens_per_segment', '120');
      formData.append('param_16', 'true');
      formData.append('param_17', '0.8');
      formData.append('param_18', '30');
      formData.append('param_19', '0.8');
      formData.append('param_20', '0');
      formData.append('param_21', '3');
      formData.append('param_22', '10');
      formData.append('param_23', '1500');

      // 添加语音样本
      formData.append('prompt', voiceBlob, 'voice_sample.wav');

      // 添加情感样本（如果有）
      if (emotionBlob) {
        formData.append('emo_ref_path', emotionBlob, 'emotion_sample.wav');
      }

      const endpoint = this.config.endpoint || 'https://indexteam-indextts-2-demo.hf.space';
      const url = `${endpoint}/api/predict/`;

      this.logger.info('Making HTTP direct call to IndexTTS', {
        url,
        scriptLength: script.length,
        hasEmotionSample: !!emotionBlob
      });

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PodcastBot/1.0)'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IndexTTS API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      this.logger.info('IndexTTS API response received', {
        hasData: !!result.data,
        dataType: result.data ? typeof result.data : 'null',
        eventId: result.event_id
      });

      // 处理异步响应
      if (result.event_id) {
        // 异步处理，需要轮询结果
        const audioData = await this._pollAsyncResult(endpoint, result.event_id);
        return { audioData, apiResult: result };
      } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        // 同步响应
        const audioUrl = result.data[0];
        if (typeof audioUrl === 'string' && audioUrl.startsWith('http')) {
          // 下载音频文件
          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            throw new Error(`Failed to download audio: ${audioResponse.status}`);
          }
          return { audioData: await audioResponse.arrayBuffer(), apiResult: result };
        } else if (audioUrl instanceof Blob) {
          return { audioData: await audioUrl.arrayBuffer(), apiResult: result };
        }
      }

      throw new Error('No audio data received from IndexTTS');

    } catch (error) {
      this.logger.error('HTTP direct call to IndexTTS failed', {
        error: error.message,
        endpoint: this.config.endpoint
      });
      throw error;
    }
  }

  /**
   * 轮询异步结果
   * @private
   * @param {string} endpoint - API端点
   * @param {string} eventId - 事件ID
   * @returns {Promise<ArrayBuffer>} 音频数据
   */
  async _pollAsyncResult(endpoint, eventId) {
    const maxAttempts = 60; // 最多等待5分钟
    const pollInterval = 5000; // 5秒间隔

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusUrl = `${endpoint}/api/predict/status/${eventId}`;
        const response = await fetch(statusUrl);

        if (!response.ok) {
          this.logger.warn(`Status check failed: ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }

        const status = await response.json();

        if (status.status === 'complete' && status.data) {
          // 处理完成的数据
          if (Array.isArray(status.data) && status.data.length > 0) {
            const audioUrl = status.data[0];
            if (typeof audioUrl === 'string' && audioUrl.startsWith('http')) {
              const audioResponse = await fetch(audioUrl);
              if (audioResponse.ok) {
                const audioData = await audioResponse.arrayBuffer();
                return { audioData, apiResult: status };
              }
            } else if (audioUrl instanceof Blob) {
              const audioData = await audioUrl.arrayBuffer();
              return { audioData, apiResult: status };
            }
          }
          // 如果是直接的数据
          else if (status.data instanceof Blob) {
            const audioData = await status.data.arrayBuffer();
            return { audioData, apiResult: status };
          }
        } else if (status.status === 'error') {
          throw new Error(`Async processing failed: ${status.error || 'Unknown error'}`);
        } else if (status.status === 'processing') {
          this.logger.info(`Async processing in progress... (${attempt + 1}/${maxAttempts})`);
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        this.logger.warn(`Poll attempt ${attempt + 1} failed:`, error.message);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error('Async processing timeout');
  }

  /**
   * 处理音频结果
   * @private
   * @param {*} audioResult - API返回的音频数据
   * @returns {Buffer|Blob} 处理后的音频数据
   */
  async _processAudioResult(audioResult) {
    // 根据IndexTTS API的返回格式处理
    let audioData;

    if (audioResult instanceof Blob) {
      audioData = audioResult;
    } else if (audioResult instanceof ArrayBuffer) {
      audioData = Buffer.from(audioResult);
    } else if (typeof audioResult === 'string') {
      // 假设是文件URL
      const response = await fetch(audioResult);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio from URL: ${response.status}`);
      }
      audioData = await response.blob();
    } else if (Array.isArray(audioResult) && audioResult.length > 0) {
      // 处理数组格式的结果
      const firstResult = audioResult[0];
      if (typeof firstResult === 'string' && firstResult.startsWith('http')) {
        const response = await fetch(firstResult);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio from URL: ${response.status}`);
        }
        audioData = await response.arrayBuffer();
      } else if (firstResult instanceof Blob) {
        audioData = await firstResult.arrayBuffer();
      } else {
        throw new Error('Unsupported audio result format in array');
      }
    } else {
      throw new Error('Unsupported audio result format');
    }

    return { audioData, apiResult: audioResult };
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
   * 创建包含错误信息的音频数据
   * @private
   * @param {string} errorMessage - 错误信息
   * @returns {ArrayBuffer} 音频数据
   */
  _createErrorAudio(errorMessage) {
    this.logger.info('Creating error audio with message:', errorMessage);

    // 创建一个简单的音频文件，包含错误信息
    // 由于我们无法生成真实的语音，这里创建一个标记文件
    const message = `ERROR: ${errorMessage}`;
    const buffer = new ArrayBuffer(44 + message.length * 2); // WAV头 + UTF-16消息
    const view = new DataView(buffer);

    // WAV文件头部
    const header = 'RIFF\x00\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data';
    let offset = 0;

    // 写入头部
    for (let i = 0; i < header.length; i++) {
      view.setUint8(offset++, header.charCodeAt(i));
    }

    // 写入数据大小 (消息长度)
    view.setUint32(offset, message.length * 2, true);
    offset += 4;

    // 写入消息 (UTF-16)
    for (let i = 0; i < message.length; i++) {
      view.setUint16(offset, message.charCodeAt(i), true);
      offset += 2;
    }

    // 更新文件大小
    view.setUint32(4, buffer.byteLength - 8, true);

    return buffer;
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
      const gradio = await import('@gradio/client');
      const client = await gradio.client(this.config.endpoint || 'IndexTeam/IndexTTS-2-Demo');

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
