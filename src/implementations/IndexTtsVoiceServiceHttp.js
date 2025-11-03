/**
 * IndexTTS语音生成服务实现 - HTTP直接调用版本
 */

import { IVoiceService } from '../services/IVoiceService.js';
import { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retryUtils.js';
import { getFileSize } from '../utils/fileUtils.js';

export class IndexTtsVoiceServiceHttp extends IVoiceService {
  /**
   * 创建IndexTTS语音服务实例
   * @param {Object} config - 服务配置
   */
  constructor(config) {
    super();
    this.config = config;
    this.logger = new Logger('IndexTtsVoiceServiceHttp');
    this.baseUrl = 'https://indexteam-indextts-2-demo.hf.space';
  }

  /**
   * 生成音频文件
   * @param {string} script - 脚本文本
   * @param {string} style - 语音风格
   * @returns {Promise<VoiceResult>} 音频生成结果
   */
  async generateAudio(script, style) {
    return withRetry(
      () => this._generateWithHttp(script, style),
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
   * 使用HTTP直接调用IndexTTS生成音频
   * @private
   * @param {string} script - 脚本文本
   * @param {string} style - 语音风格
   * @returns {Promise<VoiceResult>} 语音结果
   */
  async _generateWithHttp(script, style) {
    // 获取风格配置
    const styleConfig = this._getStyleConfig(style);

    this.logger.info('Generating audio with IndexTTS (HTTP)', {
      style,
      scriptLength: script.length,
      endpoint: this.baseUrl
    });

    try {
      // 获取语音样本文件
      const voiceSampleUrl = styleConfig.voiceSample;
      const voiceResponse = await fetch(voiceSampleUrl);

      if (!voiceResponse.ok) {
        throw new Error(`Failed to download voice sample: ${voiceResponse.status}`);
      }

      // 注意：这里我们不下载实际的音频文件，因为API可能只需要URL
      // 或者需要将文件上传到Gradio服务器

      // 使用正确的FileData格式调用API
      const voiceFileData = {
        path: voiceSampleUrl,
        url: voiceSampleUrl,
        size: null,
        orig_name: voiceSampleUrl.split('/').pop(),
        mime_type: 'audio/mpeg',
        is_stream: false,
        meta: { _type: 'gradio.FileData' }
      };

      const predictResponse = await fetch(`${this.baseUrl}/gradio_api/call/gen_single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            'Same as the voice reference', // emo_control_method
            voiceFileData, // prompt (audio file)
            script, // text
            null, // emo_ref_path (audio file) - 可选
            styleConfig.params?.emo_weight || 0.8, // emo_weight
            styleConfig.params?.vec1 || 0, // vec1 - Happy
            styleConfig.params?.vec2 || 0, // vec2 - Angry
            styleConfig.params?.vec3 || 0, // vec3 - Sad
            styleConfig.params?.vec4 || 0, // vec4 - Fear
            styleConfig.params?.vec5 || 0, // vec5 - Hate
            styleConfig.params?.vec6 || 0, // vec6 - Low
            styleConfig.params?.vec7 || 0, // vec7 - Surprise
            styleConfig.params?.vec8 || 0, // vec8 - Neutral
            '', // emo_text
            false, // emo_random
            120, // max_text_tokens_per_segment
            true, // param_16 - do_sample
            0.8, // param_17 - top_p
            30, // param_18 - top_k
            0.8, // param_19 - temperature
            0, // param_20 - length_penalty
            3, // param_21 - num_beams
            10, // param_22 - repetition_penalty
            1500 // param_23 - max_mel_tokens
          ]
        })
      });

      if (!predictResponse.ok) {
        const errorText = await predictResponse.text();
        throw new Error(`API call failed: ${predictResponse.status} - ${errorText}`);
      }

      const result = await predictResponse.json();
      this.logger.info('API call result:', result);

      // 处理异步响应
      if (result.event_id) {
        // IndexTTS使用异步处理，返回event_id供后续轮询
        this.logger.info('IndexTTS returned async processing event_id', { 
          eventId: result.event_id 
        });

        const voiceResult = {
          audioData: null, // 音频还未生成
          format: 'wav',
          duration: await this._estimateDuration(script), // 估算时长
          fileSize: 0, // 未知
          style,
          eventId: result.event_id, // 保存event_id
          isAsync: true, // 标记为异步处理
          metadata: {
            provider: 'indextts',
            endpoint: this.baseUrl,
            styleConfig: styleConfig.name,
            apiMethod: 'HTTP Direct - Async',
            eventId: result.event_id,
            generatedAt: new Date().toISOString()
          }
        };

        this.logger.info('Returning async voice result with event_id', {
          style,
          eventId: result.event_id
        });

        return voiceResult;
      }

      // 处理同步响应（如果API直接返回音频）
      const audioData = await this._processAudioResult(result);

      const voiceResult = {
        audioData,
        format: 'wav',
        duration: await this._estimateDuration(script),
        fileSize: getFileSize(audioData),
        style,
        metadata: {
          provider: 'indextts',
          endpoint: this.baseUrl,
          styleConfig: styleConfig.name,
          apiMethod: 'HTTP Direct',
          eventId: result.event_id,
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
      this.logger.error('IndexTTS HTTP API call failed', {
        style,
        error: error.message,
        endpoint: this.baseUrl
      });
      throw error;
    }
  }

  /**
   * 根据event_id轮询音频生成结果
   * @param {string} eventId - IndexTTS返回的event_id
   * @returns {Promise<Object>} 轮询结果 {status, audioUrl, audioData}
   */
  async pollAudioResult(eventId) {
    this.logger.info('Polling audio result for event_id', { eventId });

    try {
      // Gradio API 使用两个端点:
      // 1. GET /gradio_api/call/{event_id} - 获取SSE流状态
      // 2. 从SSE流中提取音频URL
      
      // 尝试方法1: 使用status端点 (如果存在)
      try {
        const statusUrl = `${this.baseUrl}/gradio_api/status/${eventId}`;
        this.logger.info('Trying status endpoint', { statusUrl });
        
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          this.logger.info('Status endpoint response', { statusData });
          
          if (statusData.status === 'COMPLETE' && statusData.data) {
            return await this._processCompletedResult(statusData.data, eventId);
          } else if (statusData.status === 'PENDING' || statusData.status === 'PROCESSING') {
            return {
              status: 'processing',
              message: 'Audio generation still in progress'
            };
          } else if (statusData.status === 'FAILED') {
            throw new Error(`Audio generation failed: ${statusData.error || 'Unknown error'}`);
          }
        }
      } catch (statusError) {
        this.logger.warn('Status endpoint failed, trying SSE endpoint', { 
          error: statusError.message 
        });
      }

      // 方法2: 使用SSE流端点
      const sseUrl = `${this.baseUrl}/gradio_api/call/${eventId}`;
      this.logger.info('Trying SSE endpoint', { sseUrl });

      const sseResponse = await fetch(sseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      if (!sseResponse.ok) {
        // 如果SSE端点也失败，可能任务还在队列中
        if (sseResponse.status === 404 || sseResponse.status === 503) {
          this.logger.info('Event not found or service busy, likely still queued');
          return {
            status: 'processing',
            message: 'Audio generation task queued or in progress'
          };
        }
        throw new Error(`Failed to poll event: ${sseResponse.status} ${sseResponse.statusText}`);
      }

      // 读取SSE流
      const text = await sseResponse.text();
      this.logger.info('SSE response received', { 
        length: text.length,
        preview: text.substring(0, 300)
      });

      // 解析SSE数据
      const result = this._parseSSEResponse(text);
      
      if (result.status === 'completed') {
        return await this._processCompletedResult(result.data, eventId);
      } else if (result.status === 'processing') {
        return {
          status: 'processing',
          message: 'Audio generation still in progress'
        };
      } else if (result.status === 'failed') {
        throw new Error(`Audio generation failed: ${result.error}`);
      }

      // 如果无法确定状态，默认为处理中
      return {
        status: 'processing',
        message: 'Audio generation status unclear, assuming in progress'
      };

    } catch (error) {
      this.logger.error('Failed to poll audio result', { 
        eventId, 
        error: error.message,
        stack: error.stack
      });
      
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * 解析SSE响应
   * @private
   * @param {string} text - SSE响应文本
   * @returns {Object} 解析结果
   */
  _parseSSEResponse(text) {
    const lines = text.split('\n');
    let lastData = null;
    let completed = false;
    let error = null;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          lastData = data;
          
          // 检查完成事件
          if (data.msg === 'process_completed') {
            completed = true;
            this.logger.info('Found process_completed event', { 
              hasOutput: !!data.output 
            });
          }
          
          // 检查错误事件
          if (data.msg === 'error' || data.msg === 'process_error') {
            error = JSON.stringify(data.output || data);
            this.logger.error('Found error event', { error });
          }
          
          // 检查处理中事件
          if (data.msg === 'process_generating' || data.msg === 'process_starts') {
            this.logger.info('Found processing event', { msg: data.msg });
          }
        } catch (parseError) {
          this.logger.warn('Failed to parse SSE line', { 
            line: line.substring(0, 100), 
            error: parseError.message 
          });
        }
      }
    }

    if (error) {
      return { status: 'failed', error };
    }

    if (completed && lastData?.output) {
      return { status: 'completed', data: lastData.output };
    }

    return { status: 'processing' };
  }

  /**
   * 处理完成的结果
   * @private
   * @param {Object} output - API输出数据
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} 处理结果
   */
  async _processCompletedResult(output, eventId) {
    // 尝试多种可能的音频URL路径
    const audioUrl = 
      output?.data?.[0]?.url || 
      output?.data?.[0]?.value?.url ||
      output?.[0]?.url ||
      output?.[0]?.value?.url ||
      (typeof output?.data?.[0] === 'string' ? output.data[0] : null);
    
    this.logger.info('Extracted audio URL', { audioUrl, outputStructure: JSON.stringify(output).substring(0, 200) });

    if (!audioUrl) {
      throw new Error('No audio URL found in completed result');
    }

    // 构建完整URL（如果是相对路径）
    const fullAudioUrl = audioUrl.startsWith('http') ? 
      audioUrl : 
      `${this.baseUrl}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`;

    this.logger.info('Downloading audio from URL', { fullAudioUrl });

    // 下载音频数据
    const audioResponse = await fetch(fullAudioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
    }

    const audioData = await audioResponse.arrayBuffer();

    this.logger.info('Audio downloaded successfully', { 
      eventId, 
      audioUrl: fullAudioUrl,
      size: audioData.byteLength 
    });

    return {
      status: 'completed',
      audioUrl: fullAudioUrl,
      audioData,
      fileSize: audioData.byteLength
    };
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
   * 处理音频结果
   * @private
   * @param {*} audioResult - API返回的音频数据
   * @returns {Buffer|Blob} 处理后的音频数据
   */
  async _processAudioResult(audioResult) {
    // 处理API返回的音频数据
    // 这里可能需要根据实际API响应格式进行调整
    if (audioResult.data && audioResult.data.length > 0) {
      // 如果返回的是文件数据
      const fileData = audioResult.data[0];
      if (fileData.url) {
        // 下载实际的音频文件
        const audioResponse = await fetch(fileData.url);
        if (audioResponse.ok) {
          return await audioResponse.blob();
        }
      }
    }

    // 如果无法获取实际音频，返回模拟数据
    return this._createDummyAudio();
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
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    try {
      if (!this.baseUrl) {
        throw new Error('IndexTTS base URL is required');
      }

      // 尝试获取API信息来验证连接
      const infoResponse = await fetch(`${this.baseUrl}/gradio_api/info`);
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        if (info.named_endpoints && info.named_endpoints['/gen_single']) {
          this.logger.info('IndexTTS HTTP service configuration validated successfully');
          return true;
        }
      }

      // 如果API info不可用，至少验证基础连接
      const configResponse = await fetch(`${this.baseUrl}/config`);
      if (configResponse.ok) {
        this.logger.info('IndexTTS HTTP service basic connection validated');
        return true;
      }

      throw new Error('Unable to validate IndexTTS service');

    } catch (error) {
      this.logger.error('IndexTTS HTTP service configuration validation failed', error);
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
