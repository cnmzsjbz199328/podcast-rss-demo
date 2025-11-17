/**
 * 异步流式TTS服务 - 用于长文本语音生成
 * 基于 Kokoro-TTS 的流式 API 实现异步处理 + 状态轮询
 */

import { AudioMerger } from '../AudioMerger.js';

export class AsyncStreamingTtsService {
  constructor(config, env) {
    this.config = config;
    this.env = env;
    this.logger = { info: console.log, error: console.error, debug: console.debug };
  }

  /**
  * 发起异步生成 - 真正的流式处理
  */
  async initiateGeneration(script, style, episodeId) {
    this.logger.info('Initiating async streaming generation', {
      episodeId,
      scriptLength: script.length
    });

    try {
      // 启动流式生成任务
      const streamTask = await this._startStreamingGeneration(script, style);

      // 在数据库中记录流式任务状态
      await this.env.DB.prepare(`
      UPDATE episodes
      SET tts_event_id = ?,
      tts_status = 'processing',
      tts_provider = 'kokoro-streaming'
      WHERE id = ?
      `).bind(streamTask.taskId, episodeId).run();

  this.logger.info('Async streaming generation initiated', {
        episodeId,
        taskId: streamTask.taskId
    });

      return {
        episodeId,
    eventId: streamTask.taskId,
      status: 'processing',
      isAsync: true
    };

  } catch (error) {
      this.logger.error('Failed to initiate streaming generation', {
        episodeId,
        error: error.message
      });

      // 记录失败状态
      await this.env.DB.prepare(`
        UPDATE episodes
        SET tts_status = 'failed',
            tts_error = ?
        WHERE id = ?
      `).bind(error.message, episodeId).run();

      throw error;
    }
  }

  /**
   * 启动流式生成任务 - 使用 /generate_all 端点
   */
  async _startStreamingGeneration(script, style) {
    const voice = this._mapStyleToVoice(style);
    const speed = this.config.speed || 1.0;

    // 使用 /generate_all 端点进行流式生成
    const callUrl = 'https://tom1986-kokoro-tts.hf.space/gradio_api/call/generate_all';

    const callResponse = await fetch(callUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [script, voice, speed, true] // true for use_gpu
      })
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      throw new Error(`Failed to start streaming task: ${callResponse.status} - ${errorText}`);
    }

    const callResult = await callResponse.json();

    if (!callResult.event_id) {
      throw new Error('No event_id returned from streaming API');
    }

    return {
      taskId: callResult.event_id,
      hash: this._generateSessionHash()
    };
  }

  /**
   * 生成会话哈希
   */
  _generateSessionHash() {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
  * 轮询并处理流式结果
  */
  async pollAndProcess(episodeId, eventId) {
    this.logger.info('Polling streaming result', { episodeId, eventId });

    try {
      // 检查流式任务状态
      const status = await this._checkStreamingStatus(eventId);

      if (status.status === 'complete' && status.data) {
        // 任务完成，处理音频数据
        return await this._processCompletedAudio(status.data, episodeId);
      } else if (status.status === 'error') {
        throw new Error(`Streaming task failed: ${status.error || 'Unknown error'}`);
      } else {
        // 任务仍在进行中
        return {
          status: 'processing',
          message: 'Audio generation still in progress'
        };
      }

    } catch (error) {
      this.logger.error('Polling failed', { episodeId, error: error.message });

      // 更新失败状态
      await this.env.DB.prepare(`
        UPDATE episodes
        SET tts_status = 'failed',
            tts_error = ?
        WHERE id = ?
      `).bind(error.message, episodeId).run();

      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * 检查流式任务状态 - 使用 SSE 流
   */
  async _checkStreamingStatus(eventId) {
    try {
      // 连接到 SSE 流
      const statusUrl = `https://tom1986-kokoro-tts.hf.space/gradio_api/call/generate_all/${eventId}`;

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
      this.logger.debug('SSE response received', { length: sseText.length });

      // 解析 SSE 响应
      const result = this._parseSSEResponse(sseText);

      if (!result) {
        return { status: 'processing' };
      }

      if (result.status === 'error') {
        return {
          status: 'error',
          error: result.error || 'Unknown streaming error'
        };
      }

      if (result.status === 'completed' && result.data) {
        return {
          status: 'completed',
          data: result.data
        };
      }

      return { status: 'processing' };

    } catch (error) {
      this.logger.error('Failed to check streaming status', { eventId, error: error.message });
      throw error;
    }
  }

  /**
   * 解析 SSE 响应
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
          this.logger.debug('Failed to parse SSE data line', { line: line.substring(0, 100) });
        }
      }
    }

    this.logger.debug('Parsed SSE response', { eventType, hasData: !!eventData });

    // 检查是否完成
    if (eventType === 'complete' && eventData) {
      this.logger.info('Found complete event with data');
      return { status: 'completed', data: eventData };
    }

    // 检查是否出错
    if (eventType === 'error') {
      this.logger.error('Found error event', { eventData });
      return { status: 'error', error: eventData || 'Unknown error' };
    }

    // 仍在处理中或解析失败
    this.logger.debug('No complete/error event found');
    return null;
  }

  /**
   * 处理完成的音频数据 - 基于测试文件的实现
   */
  async _processCompletedAudio(data, episodeId) {
    try {
      // 提取音频 URL（与测试文件保持一致）
      const audioUrl = data?.[0]?.url || data?.[0];

      if (!audioUrl) {
        this.logger.error('No audio URL in streaming result', { data });
        throw new Error('No audio URL in result');
      }

      // 构建完整 URL
      const fullAudioUrl = audioUrl.startsWith('http') ? audioUrl : `https://tom1986-kokoro-tts.hf.space${audioUrl}`;

      this.logger.info('Downloading streaming audio', { fullAudioUrl });

      // 检查是否是 HLS 流（.m3u8）
      if (fullAudioUrl.endsWith('.m3u8')) {
        this.logger.info('Detected HLS stream, processing...');
        return await this._downloadHLSStream(fullAudioUrl, episodeId);
      }

      // 直接下载音频文件
      const audioResponse = await fetch(fullAudioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Download failed: ${audioResponse.status}`);
      }

      const processedAudioData = await audioResponse.arrayBuffer();

      // 计算实际时长
      const actualDuration = this._calculateActualDuration(processedAudioData);

      // 上传到 R2
      const audioKey = `audio/${new Date().toISOString().split('T')[0]}-streaming-${episodeId}.wav`;
      await this.env.PODCAST_BUCKET.put(audioKey, processedAudioData, {
        httpMetadata: { contentType: 'audio/wav' }
      });

      const finalAudioUrl = `${this.env.R2_BASE_URL}/${audioKey}`;

      // 更新数据库
      await this.env.DB.prepare(`
        UPDATE episodes
        SET audio_url = ?,
            audio_key = ?,
            file_size = ?,
            duration = ?,
            tts_status = 'completed'
        WHERE id = ?
      `).bind(
        finalAudioUrl,
        audioKey,
        processedAudioData.byteLength,
        actualDuration,
        episodeId
      ).run();

      this.logger.info('Streaming audio generation completed', {
        episodeId,
        finalAudioUrl,
        actualDuration,
        fileSize: processedAudioData.byteLength
      });

      return {
        status: 'completed',
        audioUrl: finalAudioUrl,
        duration: actualDuration,
        fileSize: processedAudioData.byteLength
      };

    } catch (error) {
      this.logger.error('Audio processing failed', { episodeId, error: error.message });
      throw error;
    }
  }

  /**
   * 下载并合并 HLS 流
   */
  async _downloadHLSStream(m3u8Url, episodeId) {
    this.logger.info('Processing HLS stream', { m3u8Url });

    const playlistResponse = await fetch(m3u8Url);
    if (!playlistResponse.ok) {
      throw new Error(`Failed to fetch playlist: ${playlistResponse.status}`);
    }

    const playlistText = await playlistResponse.text();

    // 解析 m3u8 文件，提取 .ts 分片 URL
    const lines = playlistText.split('\n');
    const segmentUrls = [];

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

    this.logger.info(`Found ${segmentUrls.length} HLS segments`);

    if (segmentUrls.length === 0) {
      throw new Error('No segments found in HLS playlist');
    }

    // 下载所有分片
    const segments = [];
    for (let i = 0; i < segmentUrls.length; i++) {
      this.logger.debug(`Downloading segment ${i + 1}/${segmentUrls.length}`);

      const segmentResponse = await fetch(segmentUrls[i]);
      if (!segmentResponse.ok) {
        throw new Error(`Failed to download segment ${i}: ${segmentResponse.status}`);
      }

      const segmentData = await segmentResponse.arrayBuffer();
      segments.push(new Uint8Array(segmentData));
    }

    // 合并所有分片
    const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
    const mergedAudio = new Uint8Array(totalLength);

    let offset = 0;
    for (const segment of segments) {
      mergedAudio.set(segment, offset);
      offset += segment.length;
    }

    this.logger.info(`HLS stream merged: ${mergedAudio.byteLength} bytes total`);

    // 计算实际时长
    const actualDuration = this._calculateActualDuration(mergedAudio.buffer);

    // 上传到 R2
    const audioKey = `audio/${new Date().toISOString().split('T')[0]}-streaming-${episodeId}.wav`;
    await this.env.PODCAST_BUCKET.put(audioKey, mergedAudio.buffer, {
      httpMetadata: { contentType: 'audio/wav' }
    });

    const finalAudioUrl = `${this.env.R2_BASE_URL}/${audioKey}`;

    // 更新数据库
    await this.env.DB.prepare(`
      UPDATE episodes
      SET audio_url = ?,
          audio_key = ?,
          file_size = ?,
          duration = ?,
          tts_status = 'completed'
      WHERE id = ?
    `).bind(
      finalAudioUrl,
      audioKey,
      mergedAudio.byteLength,
      actualDuration,
      episodeId
    ).run();

    this.logger.info('HLS streaming audio generation completed', {
      episodeId,
      finalAudioUrl,
      actualDuration,
      segmentsCount: segments.length
    });

    return {
      status: 'completed',
      audioUrl: finalAudioUrl,
      duration: actualDuration,
      fileSize: mergedAudio.byteLength
    };
  }

  



  /**
   * 计算实际音频时长 (基于WAV文件数据)
   * @param {ArrayBuffer} audioData - WAV音频数据
   * @returns {number} 实际时长(秒)
   */
  _calculateActualDuration(audioData) {
    try {
      // 解析WAV头部获取采样率和数据大小
      const view = new DataView(audioData);
      const sampleRate = view.getUint32(24, true); // 采样率在偏移24处
      const dataSize = view.getUint32(40, true);   // 数据大小在偏移40处
      const bitsPerSample = view.getUint16(34, true); // 位深度在偏移34处
      const channels = view.getUint16(22, true); // 通道数在偏移22处

      // 计算字节率和时长
      const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
      const duration = dataSize / bytesPerSecond;

      this.logger.debug('Calculated actual audio duration', {
        sampleRate,
        channels,
        bitsPerSample,
        dataSize,
        bytesPerSecond,
        duration: Math.round(duration * 100) / 100
      });

      return Math.ceil(duration);
    } catch (error) {
      this.logger.warn('Failed to calculate actual duration, using fallback', {
        error: error.message,
        dataSize: audioData.byteLength
      });
      // 回退到基于文件大小的粗略估算
      return Math.max(1, Math.ceil(audioData.byteLength / 16000)); // 假设16kHz单声道
    }
  }

  _mapStyleToVoice(style) {
    return 'af_heart';
  }
}
