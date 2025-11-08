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

  const result = await this.client.predict("/predict", {
  text: text,
  voice: voice,
  speed: speed,
  });

  

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
