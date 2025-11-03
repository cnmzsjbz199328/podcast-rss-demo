/**
 * IndexTTS API客户端 - 负责HTTP API调用和异步轮询
 */

import { Logger } from '../utils/logger.js';

export class IndexTtsApiClient {
  constructor(baseUrl = 'https://indexteam-indextts-2-demo.hf.space') {
    this.baseUrl = baseUrl;
    this.logger = new Logger('IndexTtsApiClient');
  }

  /**
   * 发送语音生成请求
   * @param {Object} params - 请求参数
   * @returns {Promise<Object>} API响应
   */
  async sendGenerationRequest(params) {
    const formData = this._buildFormData(params);

    const response = await fetch(`${this.baseUrl}/api/predict/`, {
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

    return result;
  }

  /**
   * 轮询异步结果
   * @param {string} eventId - 事件ID
   * @returns {Promise<Object>} 轮询结果
   */
  async pollAsyncResult(eventId) {
    this.logger.info('Polling async result for event_id', { eventId });

    try {
      const statusUrl = `${this.baseUrl}/gradio_api/call/${eventId}`;

      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to poll event status: ${statusResponse.status} ${statusResponse.statusText}`);
      }

      const text = await statusResponse.text();
      this.logger.info('SSE response received', {
        length: text.length,
        preview: text.substring(0, 200)
      });

      const result = this._parseSSEResponse(text);

      if (!result) {
        return { status: 'processing', message: 'Audio generation still in progress' };
      }

      // 处理完成的结果
      const audioUrl = result.data?.[0]?.url || result.data?.[0]?.value?.url;

      if (!audioUrl) {
        throw new Error('No audio URL in completed result');
      }

      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }

      const audioData = await audioResponse.arrayBuffer();

      this.logger.info('Audio downloaded successfully', {
        eventId,
        audioUrl,
        size: audioData.byteLength
      });

      return {
        status: 'completed',
        audioUrl,
        audioData,
        fileSize: audioData.byteLength
      };

    } catch (error) {
      this.logger.error('Async polling failed', {
        eventId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 构建表单数据
   * @private
   * @param {Object} params - 参数
   * @returns {FormData} 表单数据
   */
  _buildFormData(params) {
    const formData = new FormData();

    // 设置基本参数
    formData.append('emo_control_method', params.emoControlMethod || 'Same as the voice reference');
    formData.append('text', params.text);
    formData.append('emo_weight', params.emoWeight?.toString() || '0.8');
    formData.append('vec1', params.emotionVector?.[0]?.toString() || '0');
    formData.append('vec2', params.emotionVector?.[1]?.toString() || '0');
    formData.append('vec3', params.emotionVector?.[2]?.toString() || '0');
    formData.append('vec4', params.emotionVector?.[3]?.toString() || '0');
    formData.append('vec5', params.emotionVector?.[4]?.toString() || '0');
    formData.append('vec6', params.emotionVector?.[5]?.toString() || '0');
    formData.append('vec7', params.emotionVector?.[6]?.toString() || '0');
    formData.append('vec8', params.emotionVector?.[7]?.toString() || '0');
    formData.append('emo_text', params.emoText || '');
    formData.append('emo_random', params.emoRandom?.toString() || 'false');
    formData.append('max_text_tokens_per_segment', params.maxTokens?.toString() || '120');
    formData.append('param_16', params.doSample?.toString() || 'true');
    formData.append('param_17', params.topP?.toString() || '0.8');
    formData.append('param_18', params.topK?.toString() || '30');
    formData.append('param_19', params.temperature?.toString() || '0.8');
    formData.append('param_20', params.lengthPenalty?.toString() || '0');
    formData.append('param_21', params.numBeams?.toString() || '3');
    formData.append('param_22', params.repetitionPenalty?.toString() || '10');
    formData.append('param_23', params.maxMelTokens?.toString() || '1500');

    // 添加语音样本
    if (params.voiceBlob) {
      formData.append('prompt', params.voiceBlob, 'voice_sample.wav');
    }

    // 添加情感样本
    if (params.emotionBlob) {
      formData.append('emo_ref_path', params.emotionBlob, 'emotion_sample.wav');
    }

    return formData;
  }

  /**
   * 解析SSE响应
   * @private
   * @param {string} text - SSE响应文本
   * @returns {Object|null} 解析结果
   */
  _parseSSEResponse(text) {
    const lines = text.split('\n');
    let result = null;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.msg === 'process_completed' && data.output) {
            result = data.output;
            this.logger.info('Audio generation completed');
            break;
          }

          if (data.msg === 'process_error') {
            throw new Error(`Audio generation failed: ${JSON.stringify(data.output)}`);
          }
        } catch (parseError) {
          this.logger.warn('Failed to parse SSE data', { line, error: parseError.message });
        }
      }
    }

    return result;
  }
}
