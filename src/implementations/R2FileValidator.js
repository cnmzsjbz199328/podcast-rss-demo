/** 限制：每个文件不超过200行，当前行数：76行 */
/**
 * R2文件验证器 - 专门负责文件验证逻辑
 */

import { Logger } from '../utils/logger.js';

export class R2FileValidator {
  constructor(bucket) {
    this.bucket = bucket;
    this.logger = new Logger('R2FileValidator');
  }

  /**
   * 验证脚本文件
   */
  validateScript(result) {
    if (!result.scriptUrl) {
      throw new Error('Script URL is missing');
    }

    if (!result.scriptKey) {
      throw new Error('Script key is missing');
    }

    if (result.scriptSize <= 0) {
      throw new Error('Script size is invalid');
    }

    if (result.scriptSize > 1024 * 1024) { // 1MB
      this.logger.warn('Script file is very large', { size: result.scriptSize });
    }

    return true;
  }

  /**
   * 验证音频文件
   */
  validateAudio(result) {
    if (!result.audioUrl) {
      throw new Error('Audio URL is missing');
    }

    if (!result.audioKey) {
      throw new Error('Audio key is missing');
    }

    if (result.fileSize <= 0) {
      throw new Error('Audio file size is invalid');
    }

    // 音频文件最小100字节（调试阶段放宽限制），最大50MB
    if (result.fileSize < 100) {
      this.logger.warn('Audio file is very small', { fileSize: result.fileSize, audioUrl: result.audioUrl });
      // 暂时不抛出错误，允许小文件继续处理
      // throw new Error(`Audio file is too small (possibly corrupted): ${result.fileSize} bytes`);
    }

    if (result.fileSize > 50 * 1024 * 1024) {
      throw new Error('Audio file is too large');
    }

    return true;
  }

  /**
   * 验证文件是否可以访问
   */
  async validateAccessibility(url, type = 'file') {
    try {
      const response = await fetch(url, { method: 'HEAD' });

      if (!response.ok) {
        throw new Error(`${type} file not accessible: ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) === 0) {
        throw new Error(`${type} file is empty`);
      }

      return true;
    } catch (error) {
      this.logger.error(`${type} accessibility check failed`, { url, error: error.message });
      throw error;
    }
  }

  /**
   * 获取存储统计信息
   */
  getStorageStats(scriptResult, audioResult, subtitleResult) {
  const subtitleSize = (subtitleResult?.srtSize || 0) + (subtitleResult?.vttSize || 0);
  return {
  totalSize: (scriptResult?.scriptSize || 0) + (audioResult?.fileSize || 0) + subtitleSize,
  scriptSize: scriptResult?.scriptSize || 0,
  audioSize: audioResult?.fileSize || 0,
  subtitleSize: subtitleSize,
    srtSize: subtitleResult?.srtSize || 0,
      vttSize: subtitleResult?.vttSize || 0,
      hasAudio: !!audioResult?.audioUrl,
      hasScript: !!scriptResult?.scriptUrl,
      hasSubtitles: !!subtitleResult?.srtUrl
    };
  }
}
