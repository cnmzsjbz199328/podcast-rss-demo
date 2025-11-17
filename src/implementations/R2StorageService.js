/** 限制：每个文件不超过200行，当前行数：95行 */
/**
 * R2 存储服务 - 重构后的精简版本
 * 使用组合模式，将职责分离到专用组件中
 */

import { Logger } from '../utils/logger.js';
import { R2FileUploader } from './R2FileUploader.js';
import { R2FileValidator } from './R2FileValidator.js';

export class R2StorageService {
  /**
   * @param {R2Bucket} bucket - Cloudflare R2 bucket 绑定
   * @param {string} baseUrl - R2 公开访问的基础 URL
   */
  constructor(bucket, baseUrl) {
    this.bucket = bucket;
    this.baseUrl = baseUrl;
    this.logger = new Logger('R2StorageService');

    // 初始化组件
    this.uploader = new R2FileUploader(bucket, baseUrl);
    this.validator = new R2FileValidator(bucket);
  }

  /**
  * 存储脚本、音频和字幕文件
  */
  async storeFiles(scriptResult, voiceResult, subtitleResult, episodeId) {
  const uploadPromises = [];

  // 上传脚本文件
  const scriptUpload = this.uploader.uploadScript(scriptResult, episodeId);
  uploadPromises.push(scriptUpload);

  // 上传音频文件（如果有）
  let audioUpload = null;
  if (voiceResult?.audioData) {
    audioUpload = this.uploader.uploadAudio(voiceResult.audioData, voiceResult, episodeId);
    uploadPromises.push(audioUpload);
  } else {
    // 在异步模式下，没有音频数据，添加null占位符
    uploadPromises.push(null);
  }

  // 上传字幕文件（如果有）
  let subtitleUpload = null;
    if (subtitleResult) {
      subtitleUpload = this.uploader.uploadSubtitles(subtitleResult, episodeId, scriptResult.style);
      uploadPromises.push(subtitleUpload);
    }

    // 并行上传
    const results = await Promise.all(uploadPromises);
    const scriptResult_uploaded = results[0];
    const audioResult_uploaded = results[1] || null; // 音频可能为null
    const subtitleResult_uploaded = results[2] || null; // 字幕可能为null

    // 验证上传结果
    this.validator.validateScript(scriptResult_uploaded);

    const storageResult = {
      scriptUrl: scriptResult_uploaded.scriptUrl,
      scriptKey: scriptResult_uploaded.scriptKey,
      scriptSize: scriptResult_uploaded.scriptSize,
      uploadedAt: new Date().toISOString(),
      episodeId
    };

    // 如果有音频，添加到结果中
    if (audioResult_uploaded) {
    this.validator.validateAudio(audioResult_uploaded);
    storageResult.audioUrl = audioResult_uploaded.audioUrl;
    storageResult.audioKey = audioResult_uploaded.audioKey;
    storageResult.fileSize = audioResult_uploaded.fileSize;
    }

    // 如果有字幕，添加到结果中
    if (subtitleResult_uploaded) {
    storageResult.srtUrl = subtitleResult_uploaded.srtUrl;
    storageResult.vttUrl = subtitleResult_uploaded.vttUrl;
    storageResult.jsonUrl = subtitleResult_uploaded.jsonUrl;
    storageResult.srtKey = subtitleResult_uploaded.srtKey;
    storageResult.vttKey = subtitleResult_uploaded.vttKey;
    storageResult.jsonKey = subtitleResult_uploaded.jsonKey;
    storageResult.srtSize = subtitleResult_uploaded.srtSize;
      storageResult.vttSize = subtitleResult_uploaded.vttSize;
      storageResult.jsonSize = subtitleResult_uploaded.jsonSize;
      storageResult.subtitleBlockCount = subtitleResult_uploaded.blockCount;
      storageResult.subtitleWordCount = subtitleResult_uploaded.wordCount;
    }

    // 获取统计信息
    const stats = this.validator.getStorageStats(scriptResult_uploaded, audioResult_uploaded, subtitleResult_uploaded);

    this.logger.info('Files stored successfully', {
    episodeId,
    scriptUrl: storageResult.scriptUrl,
    audioUrl: storageResult.audioUrl,
    srtUrl: storageResult.srtUrl,
      vttUrl: storageResult.vttUrl,
      jsonUrl: storageResult.jsonUrl,
      totalSize: stats.totalSize
    });

    return {
      ...storageResult,
      metadata: {
        stats,
        uploadedAt: storageResult.uploadedAt
      }
    };
  }

  /**
   * 验证存储配置
   */
  async validateConfig() {
    try {
      if (!this.bucket) {
        throw new Error('R2 bucket is not configured');
      }

      if (!this.baseUrl) {
        throw new Error('R2 base URL is not configured');
      }

      this.logger.info('R2 storage configuration validated successfully');
      return true;
    } catch (error) {
      this.logger.error('R2 storage configuration validation failed', error);
      return false;
    }
  }

  /**
   * 获取存储统计信息
   */
  getStorageStats() {
    // TODO: 实现实际的存储统计
    return {
      totalFiles: 0,
      totalSize: 0,
      lastUpload: null
    };
  }
}
