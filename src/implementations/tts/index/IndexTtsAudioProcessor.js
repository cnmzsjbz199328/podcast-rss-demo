/**
 * IndexTTS音频处理器 - 负责音频结果处理和格式转换
 */

import { Logger } from '../../../utils/logger.js';

export class IndexTtsAudioProcessor {
  constructor() {
    this.logger = new Logger('IndexTtsAudioProcessor');
  }

  /**
   * 处理音频结果
   * @param {any} audioResult - API返回的音频数据
   * @returns {Promise<{audioData: ArrayBuffer, apiResult: any}>} 处理结果
   */
  async processAudioResult(audioResult) {
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
   * 创建错误音频文件
   * @param {string} errorMessage - 错误信息
   * @returns {ArrayBuffer} 错误音频数据
   */
  createErrorAudio(errorMessage) {
    this.logger.info('Creating error audio with message:', errorMessage);

    // 创建一个简单的音频文件，包含错误信息
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
   * @param {string} script - 脚本文本
   * @returns {number} 估算时长(秒)
   */
  estimateDuration(script) {
    // 简单估算：中文大约每分钟250字，英文每分钟150单词
    const chineseChars = (script.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = script.split(/\s+/).filter(word => word.length > 0).length;

    // 中文约200字/分钟，英文约150单词/分钟
    const chineseDuration = (chineseChars / 200) * 60;
    const englishDuration = (englishWords / 150) * 60;

    return Math.max(chineseDuration + englishDuration, 10); // 最少10秒
  }
}
