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

  console.log(`🎵 Starting Kokoro TTS generation - Text length: ${text.length} chars, voice: ${voice}, speed: ${speed}`);

  // 警告：Kokoro TTS 对长文本可能有实际限制
  if (text.length > 10000) {
      console.warn(`⚠️ Text is very long (${text.length} chars), Kokoro TTS may have issues with long texts`);
  }

  // 使用 generate_all 端点支持长文本异步生成
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
      console.error('Failed to initiate Kokoro TTS generation:', errorText);
    throw new Error(`Failed to initiate generation: ${callResponse.status} - ${errorText}`);
    }

  const callResult = await callResponse.json();
  const eventId = callResult.event_id;

  console.log('Kokoro TTS API call result:', JSON.stringify(callResult, null, 2));

  if (!eventId) {
      console.error('No event_id in response:', callResult);
      throw new Error('No event_id returned from API');
    }

    console.log(`🔄 Starting to wait for completion with event_id: ${eventId}`);

    // 使用异步等待获取结果
    const result = await this._waitForCompletion(eventId);
    console.log('Kokoro TTS generation completed:', JSON.stringify(result, null, 2));

  console.log('Processing audio data from Kokoro TTS result:', result);

  // 按照 test.js 的逻辑处理音频数据
  let audioUrl;
  if (Array.isArray(result.data)) {
    audioUrl = result.data[0]?.url || result.data[0];
  } else {
    audioUrl = result.data?.url || result.data;
  }

  console.log('Extracted audio URL:', audioUrl);

  if (!audioUrl) {
    console.error('No audio URL found in result:', result);
    throw new Error("No audio URL returned from Kokoro-TTS API");
  }

  // 构建完整 URL
  const fullAudioUrl = audioUrl.startsWith('http') ? audioUrl : `https://tom1986-kokoro-tts.hf.space${audioUrl}`;
  console.log('Full audio URL:', fullAudioUrl);

  // 检查是否是 HLS 流
  if (fullAudioUrl.endsWith('.m3u8')) {
    console.log('Detected HLS stream, downloading HLS segments...');
    return await this._downloadHLSStream(fullAudioUrl);
  }

  // 下载音频文件
  console.log('Downloading audio from:', fullAudioUrl);
  const response = await fetch(fullAudioUrl);
  if (!response.ok) {
    console.error(`Failed to download audio: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log(`Audio downloaded successfully: ${arrayBuffer.byteLength} bytes`);

  if (arrayBuffer.byteLength < 1024) {
    console.warn(`Audio file is very small: ${arrayBuffer.byteLength} bytes`);
  }

  return {
    audioData: arrayBuffer,
    format: 'wav'
  };
  }

  /**
   * 等待生成完成 - 使用 SSE 流式监听（类似 test.js 实现）
   */
  async _waitForCompletion(eventId) {
    const statusUrl = `https://tom1986-kokoro-tts.hf.space/gradio_api/call/generate_all/${eventId}`;

    console.log(`🔄 Waiting for completion at: ${statusUrl}`);

    // 连接到 SSE 流并获取完整响应
    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      throw new Error(`SSE connection failed: ${statusResponse.status} - ${errorText}`);
    }

    const sseText = await statusResponse.text();
    console.log(`📨 SSE response received, length: ${sseText.length}`);

    // 解析 SSE 响应
    const result = this._parseSSEResponse(sseText);

    if (!result) {
      throw new Error('No complete event found in SSE stream');
    }

    if (result.status === 'error') {
      throw new Error(`Generation failed: ${result.error || 'Unknown error'}`);
    }

    return result;
  }

  /**
   * 解析 SSE 响应（基于 test.js 的实现）
   */
  _parseSSEResponse(text) {
    const lines = text.split('\n');
    let eventType = null;
    let eventData = null;

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.substring(7).trim();
      } else if (line.startsWith('data: ')) {
        try {
          eventData = JSON.parse(line.substring(6));
        } catch (parseError) {
          console.warn('⚠️ Failed to parse SSE data:', line);
        }
      }
    }

    console.log('🔍 Parsed SSE - eventType:', eventType, 'hasData:', !!eventData);

    // 检查是否完成
    if (eventType === 'complete' && eventData) {
      console.log('✅ Found complete event with data');
      return { status: 'completed', data: eventData };
    }

    // 检查是否出错
    if (eventType === 'error') {
      console.error('❌ Found error event:', eventData);
      return { status: 'error', error: eventData || 'Unknown error' };
    }

    // 仍在处理中或解析失败
    console.warn('⚠️ No complete/error event found');
    return null;
  }

  /**
   * 下载 HLS 流并合并为单个音频文件
   */
  async _downloadHLSStream(m3u8Url) {
    console.log('Downloading HLS playlist from:', m3u8Url);

    // 下载 M3U8 播放列表
    const playlistResponse = await fetch(m3u8Url);
    if (!playlistResponse.ok) {
      throw new Error(`Failed to download HLS playlist: ${playlistResponse.status}`);
    }

    const playlistText = await playlistResponse.text();
    console.log(`Downloaded HLS playlist (${playlistText.length} bytes)`);

    // 解析播放列表，提取分片 URL
    const segmentUrls = [];
    const lines = playlistText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // 跳过注释和空行
      if (trimmed && !trimmed.startsWith('#')) {
        // 构建完整 URL
        const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
        const segmentUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
        segmentUrls.push(segmentUrl);
      }
    }

    console.log(`Found ${segmentUrls.length} HLS segments`);

    if (segmentUrls.length === 0) {
      throw new Error('No segments found in HLS playlist');
    }

    // 下载所有分片
    const segments = [];
    for (let i = 0; i < segmentUrls.length; i++) {
      console.log(`Downloading segment ${i + 1}/${segmentUrls.length}...`);

      const segmentResponse = await fetch(segmentUrls[i]);
      if (!segmentResponse.ok) {
        throw new Error(`Failed to download segment ${i}: ${segmentResponse.status}`);
      }

      const segmentData = await segmentResponse.arrayBuffer();
      segments.push(new Uint8Array(segmentData));
      console.log(`Segment ${i + 1} downloaded: ${segmentData.byteLength} bytes`);
    }

    // 合并所有分片
    const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
    const mergedAudio = new Uint8Array(totalLength);

    let offset = 0;
    for (const segment of segments) {
      mergedAudio.set(segment, offset);
      offset += segment.length;
    }

    console.log(`HLS stream merged successfully: ${mergedAudio.byteLength} bytes total`);

    return {
      audioData: mergedAudio.buffer,
      format: 'wav' // HLS 通常是 MPEG-TS 格式，但这里我们当作 WAV 处理
    };
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
