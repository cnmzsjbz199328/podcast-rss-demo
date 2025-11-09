/**
 * WAV音频合并器 - 正确合并多个WAV文件
 */

export class AudioMerger {
  constructor() {
    this.logger = { info: console.log, error: console.error, debug: console.debug };
  }

  /**
   * 合并多个WAV音频块
   * @param {Array<{audioData: ArrayBuffer, duration: number}>} audioChunks
   * @returns {ArrayBuffer} 合并后的WAV数据
   */
  mergeWavChunks(audioChunks) {
    if (!audioChunks || audioChunks.length === 0) {
      throw new Error('No audio chunks to merge');
    }

    if (audioChunks.length === 1) {
      // 只有一个块，直接返回
      return audioChunks[0].audioData;
    }

    this.logger.info(`Merging ${audioChunks.length} WAV chunks`);

    try {
      // 解析第一个WAV文件的头部信息
      const firstChunk = audioChunks[0];
      const headerInfo = this._parseWavHeader(firstChunk.audioData);

      this.logger.debug('WAV header info:', {
        sampleRate: headerInfo.sampleRate,
        channels: headerInfo.channels,
        bitsPerSample: headerInfo.bitsPerSample,
        dataOffset: headerInfo.dataOffset
      });

      // 提取所有块的音频数据
      const audioDataParts = [];
      for (const chunk of audioChunks) {
        const dataPart = this._extractAudioData(chunk.audioData);
        audioDataParts.push(dataPart);
      }

      // 合并音频数据
      const totalDataLength = audioDataParts.reduce((sum, part) => sum + part.length, 0);
      const mergedData = new Uint8Array(totalDataLength);
      let offset = 0;

      for (const dataPart of audioDataParts) {
        mergedData.set(dataPart, offset);
        offset += dataPart.length;
      }

      // 构建新的WAV头部
      const newHeader = this._buildWavHeader(headerInfo, mergedData.length);

      // 合并头部和数据
      const result = new Uint8Array(newHeader.length + mergedData.length);
      result.set(newHeader, 0);
      result.set(mergedData, newHeader.length);

      this.logger.info('WAV chunks merged successfully', {
        totalChunks: audioChunks.length,
        totalDataSize: totalDataLength,
        finalSize: result.length
      });

      return result.buffer;

    } catch (error) {
      this.logger.error('Failed to merge WAV chunks:', error);
      throw error;
    }
  }

  /**
   * 解析WAV文件头部
   * @param {ArrayBuffer} wavData
   * @returns {Object} 头部信息
   */
  _parseWavHeader(wavData) {
    const view = new DataView(wavData);

    // 检查RIFF头部
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (riff !== 'RIFF') {
      throw new Error('Invalid WAV file: missing RIFF header');
    }

    const fileSize = view.getUint32(4, true);

    // 检查WAVE格式
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (wave !== 'WAVE') {
      throw new Error('Invalid WAV file: missing WAVE format');
    }

    // 查找fmt块
    let offset = 12;
    let fmtFound = false;
    let audioFormat, channels, sampleRate, bitsPerSample;

    while (offset < wavData.byteLength - 8) {
      const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === 'fmt ') {
        audioFormat = view.getUint16(offset + 8, true);
        channels = view.getUint16(offset + 10, true);
        sampleRate = view.getUint32(offset + 12, true);
        bitsPerSample = view.getUint16(offset + 22, true);
        fmtFound = true;
        break;
      }

      offset += 8 + chunkSize;
    }

    if (!fmtFound) {
      throw new Error('Invalid WAV file: missing fmt chunk');
    }

    // 查找data块
    let dataOffset = -1;
    let dataSize = 0;
    offset = 12;

    while (offset < wavData.byteLength - 8) {
      const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === 'data') {
        dataOffset = offset + 8;
        dataSize = chunkSize;
        break;
      }

      offset += 8 + chunkSize;
    }

    if (dataOffset === -1) {
      throw new Error('Invalid WAV file: missing data chunk');
    }

    return {
      audioFormat,
      channels,
      sampleRate,
      bitsPerSample,
      dataOffset,
      dataSize
    };
  }

  /**
   * 提取WAV文件的音频数据部分
   * @param {ArrayBuffer} wavData
   * @returns {Uint8Array} 音频数据
   */
  _extractAudioData(wavData) {
    const headerInfo = this._parseWavHeader(wavData);
    return new Uint8Array(wavData, headerInfo.dataOffset, headerInfo.dataSize);
  }

  /**
   * 构建新的WAV头部
   * @param {Object} headerInfo 原始头部信息
   * @param {number} dataLength 音频数据长度
   * @returns {Uint8Array} WAV头部
   */
  _buildWavHeader(headerInfo, dataLength) {
    const { audioFormat, channels, sampleRate, bitsPerSample } = headerInfo;

    // 计算各种大小
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const fileSize = 36 + dataLength; // RIFF header size + data

    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF chunk
    view.setUint8(0, 'R'.charCodeAt(0));
    view.setUint8(1, 'I'.charCodeAt(0));
    view.setUint8(2, 'F'.charCodeAt(0));
    view.setUint8(3, 'F'.charCodeAt(0));
    view.setUint32(4, fileSize, true);

    // WAVE chunk
    view.setUint8(8, 'W'.charCodeAt(0));
    view.setUint8(9, 'A'.charCodeAt(0));
    view.setUint8(10, 'V'.charCodeAt(0));
    view.setUint8(11, 'E'.charCodeAt(0));

    // fmt chunk
    view.setUint8(12, 'f'.charCodeAt(0));
    view.setUint8(13, 'm'.charCodeAt(0));
    view.setUint8(14, 't'.charCodeAt(0));
    view.setUint8(15, ' '.charCodeAt(0));
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, audioFormat, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    view.setUint8(36, 'd'.charCodeAt(0));
    view.setUint8(37, 'a'.charCodeAt(0));
    view.setUint8(38, 't'.charCodeAt(0));
    view.setUint8(39, 'a'.charCodeAt(0));
    view.setUint32(40, dataLength, true);

    return new Uint8Array(header);
  }
}
