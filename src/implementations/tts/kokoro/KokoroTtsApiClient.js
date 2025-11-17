/**
 * Kokoro-TTS API 客户端
 * 使用 @gradio/client 与 Hugging Face Space 交互
 */

import { Client } from "@gradio/client";

export class KokoroTtsApiClient {
  constructor() {
    this.client = null;
    this.spaceUrl = "Tom1986/Kokoro-TTS";
  }

  /**
   * 初始化客户端
   */
  async initialize() {
    if (!this.client) {
      this.client = await Client.connect(this.spaceUrl);
    }
    return this.client;
  }

  /**
  * 生成音频
  * @param {string} text - 要转换的文本
  * @param {string} voice - 语音类型 (默认: "af_heart")
  * @param {number} speed - 语速 (默认: 1)
  * @returns {Promise<{audioData: ArrayBuffer, format: string}>}
  */
  async generateAudio(text, voice = "af_heart", speed = 1) {
    await this.initialize();

    // 使用 generate_all 端点支持长文本流式生成
    const callUrl = `https://tom1986-kokoro-tts.hf.space/gradio_api/call/generate_all`;

  const callResponse = await fetch(callUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [text, voice, speed, false] // false for use_gpu in basic mode
      })
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      throw new Error(`Failed to generate audio: ${callResponse.status} - ${errorText}`);
    }

    const callResult = await callResponse.json();
    const eventId = callResult.event_id;

    console.log('Kokoro TTS API call result:', callResult);

    if (!eventId) {
      throw new Error('No event_id returned from API');
    }

    // 等待生成完成并获取结果
    const result = await this._pollForResult(eventId);
    console.log('Kokoro TTS generation result:', result);

  // result.data 是一个数组，第一个元素是音频文件数据
  let audioData;
  if (Array.isArray(result.data)) {
  audioData = result.data[0];
  } else {
  audioData = result.data;
  }

  if (!audioData) {
    throw new Error("No audio data returned from Kokoro-TTS API");
    }

  // 检查是否是文件对象
  if (typeof audioData === 'object' && audioData.url) {
    // 如果是文件对象，下载URL
      const response = await fetch(audioData.url);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`);
    }
      const arrayBuffer = await response.arrayBuffer();
    return {
      audioData: arrayBuffer,
      format: 'wav'
  };
  } else if (audioData instanceof ArrayBuffer || audioData instanceof Uint8Array) {
    // 如果直接返回二进制数据
    return {
      audioData: audioData instanceof Uint8Array ? audioData.buffer : audioData,
      format: 'wav'
      };
  } else {
  throw new Error(`Unexpected audio data format: ${typeof audioData}`);
  }
  }

  /**
  * 轮询生成结果 - 同步等待完成
  */
  async _pollForResult(eventId) {
    const statusUrl = `https://tom1986-kokoro-tts.hf.space/gradio_api/call/generate_all/${eventId}`;

    // 轮询直到完成，最多等待 5 分钟
    const maxAttempts = 60;
    const pollInterval = 5000; // 5秒间隔

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
          }
        });

        if (!statusResponse.ok) {
          throw new Error(`Poll failed: ${statusResponse.status}`);
        }

        const sseText = await statusResponse.text();
        const result = this._parseSSEResponse(sseText);

        if (result && result.status === 'completed' && result.data) {
          console.log('Kokoro TTS generation completed successfully');
          return result;
        } else if (result && result.status === 'error') {
          console.log('Kokoro TTS generation failed:', result.error);
          throw new Error(`Generation failed: ${result.error || 'Unknown error'}`);
        }

        console.log(`Kokoro TTS polling attempt ${attempt + 1}/${maxAttempts}, status: ${result ? result.status : 'no result'}`);
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        console.warn(`Poll attempt ${attempt + 1} failed:`, error.message);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error('Audio generation timed out');
  }

  /**
   * 解析 SSE 响应
   */
  _parseSSEResponse(sseText) {
    console.log('Parsing SSE response, length:', sseText.length);
    const lines = sseText.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          console.log('Parsed SSE data:', data);

          if (data.msg === 'process_completed') {
            console.log('Process completed, data:', data.output);
            return {
              status: 'completed',
              data: data.output.data
            };
          } else if (data.msg === 'process_failed') {
            console.log('Process failed:', data.output);
            return {
              status: 'error',
              error: data.output.error || 'Process failed'
            };
          }
        } catch (e) {
          console.log('Failed to parse SSE line:', line, 'error:', e.message);
          // 忽略解析错误
        }
      }
    }

    return null;
  }

  /**
   * 获取可用语音列表 (如果API支持)
   */
  async getAvailableVoices() {
    await this.initialize();

    // 尝试调用获取随机引用的API来验证连接
    try {
      const result = await this.client.predict("/get_random_quote", {});
      return result.data ? ["af_heart", "other_voices"] : ["af_heart"]; // 默认语音列表
    } catch (error) {
      // 如果失败，返回默认列表
      return ["af_heart"];
    }
  }
}
