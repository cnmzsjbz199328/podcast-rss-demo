/**
 * E2-F5-TTS API 客户端
 * 使用 @gradio/client 与 Hugging Face Space 交互
 */

import { Client } from "@gradio/client";

export class E2F5TtsApiClient {
  constructor(options = {}) {
    this.client = null;
    this.spaceUrl = "Tom1986/E2-F5-TTS";
    this.refAudioUrl = options.refAudioUrl || "https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/gdg.mp3";
    this.refText = options.refText || "找一个回酒店开房！";
    this.removeSilence = options.removeSilence !== false; // 默认true
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
   * 下载参考音频
   */
  async _downloadRefAudio() {
    const response = await fetch(this.refAudioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download reference audio: ${response.status}`);
    }
    return await response.blob();
  }

  /**
   * 生成音频
   * @param {string} text - 要转换的文本
   * @returns {Promise<{audioData: ArrayBuffer, format: string}>}
   */
  async generateAudio(text) {
    await this.initialize();

    // 下载参考音频
    const refAudioBlob = await this._downloadRefAudio();

    const result = await this.client.predict("/predict", {
      ref_audio: refAudioBlob,
      ref_text: this.refText,
      gen_text: text,
      remove_silence: this.removeSilence,
    });

    // result.data 是一个数组，第一个元素是音频文件数据
    let audioData;
    if (Array.isArray(result.data)) {
      audioData = result.data[0];
    } else {
      audioData = result.data;
    }

    if (!audioData) {
      throw new Error("No audio data returned from E2-F5-TTS API");
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
}
