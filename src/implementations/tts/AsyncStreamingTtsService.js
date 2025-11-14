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
  * 发起异步生成
  */
  async initiateGeneration(script, style, episodeId) {
  this.logger.info('Initiating async streaming generation', {
  episodeId,
  scriptLength: script.length
  });

  // 使用 @gradio/client 进行流式调用
  const { Client } = await import("@gradio/client");
  const client = await Client.connect("Tom1986/Kokoro-TTS");

  const voice = this._mapStyleToVoice(style);
  const speed = this.config.speed || 1.0;

  try {
  // 使用 /generate_all 端点进行流式生成
  const result = await client.predict("/generate_all", {
  text: script,
  voice: voice,
    speed: speed,
      use_gpu: "true"
      });

  this.logger.info('Streaming generation completed synchronously', {
      episodeId,
        resultType: typeof result.data
    });

      // 如果结果是音频数据，直接处理
    if (result.data) {
    return await this._processAudioResult(result.data, episodeId);
    } else {
        throw new Error('No audio data in streaming result');
    }

  } catch (error) {
  this.logger.error('Streaming generation failed', {
  episodeId,
  error: error.message
  });
  throw error;
  }
  }

  /**
  * 处理音频结果
  */
  async _processAudioResult(audioData, episodeId) {
  try {
  // 处理音频数据（与同步版本相同）
    let processedAudioData;
      if (typeof audioData === 'object' && audioData.url) {
        // 如果是文件对象，下载URL
        const response = await fetch(audioData.url);
        if (!response.ok) {
          throw new Error(`Failed to download audio: ${response.status}`);
        }
        processedAudioData = await response.arrayBuffer();
      } else if (audioData instanceof ArrayBuffer || audioData instanceof Uint8Array) {
        processedAudioData = audioData instanceof Uint8Array ? audioData.buffer : audioData;
      } else {
        throw new Error(`Unexpected audio data format: ${typeof audioData}`);
      }

      // 计算实际时长
      const actualDuration = this._calculateActualDuration(processedAudioData);

      // 上传到 R2
      const audioKey = `audio/${new Date().toISOString().split('T')[0]}-streaming-${episodeId}.wav`;
      await this.env.PODCAST_BUCKET.put(audioKey, processedAudioData, {
        httpMetadata: { contentType: 'audio/wav' }
      });

      const audioUrl = `${this.env.R2_BASE_URL}/${audioKey}`;

      // 更新数据库
      await this.env.DB.prepare(`
        UPDATE episodes
        SET audio_url = ?,
            audio_key = ?,
            file_size = ?,
            duration = ?,
            tts_status = 'completed',
            tts_provider = 'kokoro-streaming',
            updated_at = ?
        WHERE id = ?
      `).bind(
        audioUrl,
        audioKey,
        processedAudioData.byteLength,
        actualDuration,
        new Date().toISOString(),
        episodeId
      ).run();

      this.logger.info('Async generation completed', {
        episodeId,
        audioUrl,
        actualDuration
      });

      return {
        episodeId,
        status: 'completed',
        audioUrl,
        duration: actualDuration,
        fileSize: processedAudioData.byteLength,
        isAsync: true
      };

    } catch (error) {
      this.logger.error('Audio processing failed', { episodeId, error: error.message });

      // 更新失败状态
      await this.env.DB.prepare(`
        UPDATE episodes
        SET tts_status = 'failed',
            tts_error = ?,
            updated_at = ?
        WHERE id = ?
      `).bind(error.message, new Date().toISOString(), episodeId).run();

      throw error;
    }
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
