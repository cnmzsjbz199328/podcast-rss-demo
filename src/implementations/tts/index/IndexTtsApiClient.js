/**
 * IndexTTS API客户端 - 负责HTTP API调用和异步轮询
 */

import { Logger } from '../../../utils/logger.js';

export class IndexTtsApiClient {
  constructor(baseUrl = 'https://tom1986-indextts2.hf.space') {
    this.baseUrl = baseUrl;
    this.logger = new Logger('IndexTtsApiClient');
  }

  /**
   * 发送语音生成请求
   * @param {Object} params - 请求参数
   * @returns {Promise<Object>} API响应
   */
  async sendGenerationRequest(params) {
    // 使用 Gradio API 调用方式
    const data = this._buildGradioData(params);

    const response = await fetch(`${this.baseUrl}/gradio_api/call/gen_single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PodcastBot/1.0)'
      },
      body: JSON.stringify({ data })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IndexTTS API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    this.logger.info('IndexTTS API response received', {
      eventId: result.event_id
    });

    // 返回 event_id 用于异步轮询
    return result;
  }

  /**
   * 轮询异步结果
   * 
   * 重要：Gradio SSE 是一次性的流，必须立即连接并持续读取
   * 
   * @param {string} eventId - 事件ID  
   * @param {number} waitBeforePoll - 轮询前等待时间（毫秒），默认0立即连接
   * @returns {Promise<Object>} 轮询结果
   */
  async pollAsyncResult(eventId, waitBeforePoll = 0) {
    // 如果需要等待，短暂延迟
    if (waitBeforePoll > 0) {
      this.logger.info('Waiting before connecting to SSE', { eventId, waitMs: waitBeforePoll });
      await new Promise(resolve => setTimeout(resolve, waitBeforePoll));
    }

    this.logger.info('Connecting to SSE stream immediately', { eventId });

    try {
      const statusUrl = `${this.baseUrl}/gradio_api/call/gen_single/${eventId}`;

      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        // 404 表示 session 不存在或已过期
        if (statusResponse.status === 404) {
          this.logger.warn('Session not found - may have expired', { eventId });
          return { 
            status: 'failed', 
            error: 'Session expired or not found. IndexTTS sessions are short-lived.'
          };
        }
        throw new Error(`Failed to poll event status: ${statusResponse.status} - ${errorText}`);
      }

      const text = await statusResponse.text();
      this.logger.info('SSE stream received', {
        eventId,
        length: text.length,
        preview: text.substring(0, 500)
      });

      const result = this._parseSSEResponse(text);

      if (!result) {
        // 如果解析不到complete事件，可能仍在处理中
        // 但由于SSE是一次性的，我们无法再次轮询
        this.logger.warn('SSE stream ended without complete event', { 
          eventId,
          fullText: text 
        });
        return { 
          status: 'processing', 
          message: 'Audio generation in progress (SSE stream ended, create new request to check)' 
        };
      }

      // 如果解析结果表示错误，返回失败
      if (result.status === 'error') {
        this.logger.error('SSE indicated error', { eventId, error: result.error, fullText: text });
        return { status: 'failed', error: result.error };
      }

      // 处理完成的结果
      const audioUrl = result.data?.[0]?.value?.url || result.data?.[0]?.url;

      if (!audioUrl) {
        this.logger.error('No audio URL found in completed result', { 
          eventId, 
          resultKeys: Object.keys(result),
          dataType: typeof result.data
        });
        throw new Error('No audio URL in completed result');
      }

      // 如果 URL 是相对路径，补全为完整 URL
      const fullAudioUrl = audioUrl.startsWith('http') ? audioUrl : `${this.baseUrl}${audioUrl}`;

      this.logger.info('Downloading audio file', { fullAudioUrl });
      
      const audioResponse = await fetch(fullAudioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }

      const audioData = await audioResponse.arrayBuffer();

      this.logger.info('Audio download completed', {
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

    } catch (error) {
      this.logger.error('Async polling failed', {
        eventId,
        error: error.message,
        stack: error.stack
      });
      
      // 提供更友好的错误信息
      if (error.message.includes('Session not found') || error.message.includes('404')) {
        throw new Error('Audio generation failed: IndexTTS session expired. Please generate a new podcast.');
      }
      
      throw error;
    }
  }

  /**
   * 构建 Gradio API 数据格式
   * @private
   * @param {Object} params - 参数
   * @returns {Array} Gradio API 数据数组
   */
  _buildGradioData(params) {
    // 构建语音文件数据对象
    const voiceFileData = params.voiceBlob ? {
      path: params.voiceBlob.url || 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/news-anchor.mp3',
      url: params.voiceBlob.url || 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/news-anchor.mp3',
      size: null,
      orig_name: 'voice_sample.mp3',
      mime_type: 'audio/mpeg',
      is_stream: false,
      meta: { _type: 'gradio.FileData' }
    } : null;

    // 构建情感文件数据对象（可选）
    const emotionFileData = params.emotionBlob ? {
      path: params.emotionBlob.url,
      url: params.emotionBlob.url,
      size: null,
      orig_name: 'emotion_sample.mp3',
      mime_type: 'audio/mpeg',
      is_stream: false,
      meta: { _type: 'gradio.FileData' }
    } : null;

    // 按照 gen_single 端点的参数顺序构建数据数组
    return [
      params.emoControlMethod || 'Same as the voice reference',  // emo_control_method
      voiceFileData,                                              // prompt (voice reference)
      params.text,                                                // text
      emotionFileData,                                            // emo_ref_path
      params.emoWeight !== undefined ? params.emoWeight : 0.9,    // emo_weight
      params.emotionVector?.[0] || 0.8,                           // vec1 (Happy)
      params.emotionVector?.[1] || 0,                             // vec2 (Angry)
      params.emotionVector?.[2] || 0,                             // vec3 (Sad)
      params.emotionVector?.[3] || 0,                             // vec4 (Afraid)
      params.emotionVector?.[4] || 0,                             // vec5 (Disgusted)
      params.emotionVector?.[5] || 0,                             // vec6 (Melancholic)
      params.emotionVector?.[6] || 0.6,                           // vec7 (Surprised)
      params.emotionVector?.[7] || 0,                             // vec8 (Calm)
      params.emoText || '',                                       // emo_text
      params.emoRandom || false,                                  // emo_random
      params.maxTokens || 120,                                    // max_text_tokens_per_segment
      params.doSample !== undefined ? params.doSample : true,     // param_16 (do_sample)
      params.topP !== undefined ? params.topP : 0.8,              // param_17 (top_p)
      params.topK || 30,                                          // param_18 (top_k)
      params.temperature !== undefined ? params.temperature : 0.8,// param_19 (temperature)
      params.lengthPenalty || 0,                                  // param_20 (length_penalty)
      params.numBeams || 3,                                       // param_21 (num_beams)
      params.repetitionPenalty || 10,                             // param_22 (repetition_penalty)
      params.maxMelTokens || 1500                                 // param_23 (max_mel_tokens)
    ];
  }

  /**
   * 解析SSE响应
   * @private
   * @param {string} text - SSE响应文本
   * @returns {Object|null} 解析结果
   */
  _parseSSEResponse(text) {
    const lines = text.split('\n');
    let eventType = null;
    let eventData = null;

    for (const line of lines) {
      // 解析事件类型
      if (line.startsWith('event: ')) {
        eventType = line.substring(7).trim();
      } 
      // 解析事件数据
      else if (line.startsWith('data: ')) {
        try {
          eventData = JSON.parse(line.substring(6));
        } catch (parseError) {
          this.logger.warn('Failed to parse SSE data', { line, error: parseError.message });
        }
      }
    }

    // 检查是否完成
    if (eventType === 'complete' && eventData) {
      this.logger.info('Audio generation completed', { eventType });
      return { status: 'completed', data: eventData };
    }

    // 检查是否出错（更宽松地处理没有data的情况）
    if (eventType === 'error') {
      this.logger.error('Audio generation failed (SSE error event)', { eventType, eventData });
      return { status: 'error', error: eventData || 'Unknown error (SSE stream error)' };
    }

    // 仍在处理中
    return null;
  }
}
