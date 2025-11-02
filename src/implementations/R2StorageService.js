/**
 * R2存储服务实现
 */

import { IStorageService } from '../services/IStorageService.js';
import { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retryUtils.js';
import { generateFileKey, getMimeType } from '../utils/fileUtils.js';
import { validateFileSize } from '../utils/validator.js';

export class R2StorageService extends IStorageService {
  /**
   * 创建R2存储服务实例
   * @param {Object} config - 服务配置
   */
  constructor(config) {
    super();
    this.config = config;
    this.logger = new Logger('R2StorageService');
    this.client = null;
  }

  /**
   * 存储脚本和音频文件
   * @param {ScriptResult} scriptResult - 脚本结果
   * @param {VoiceResult} voiceResult - 语音结果
   * @returns {Promise<StorageResult>} 存储结果
   */
  async storeFiles(scriptResult, voiceResult) {
    return withRetry(
      () => this._storeToR2(scriptResult, voiceResult),
      {
        maxAttempts: 3,
        initialDelay: 1000,
        shouldRetry: (error) => {
          return error.message.includes('network') ||
                 error.message.includes('timeout') ||
                 error.status >= 500;
        }
      },
      this.logger
    );
  }

  /**
   * 存储到R2
   * @private
   * @param {ScriptResult} scriptResult - 脚本结果
   * @param {VoiceResult} voiceResult - 语音结果
   * @returns {Promise<StorageResult>} 存储结果
   */
  async _storeToR2(scriptResult, voiceResult) {
    // 动态导入AWS SDK
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    if (!this.client) {
      this.client = new S3Client({
        region: this.config.region || 'auto',
        endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    // 生成文件键
    const scriptKey = generateFileKey('scripts', scriptResult.style, 'txt');
    const audioKey = generateFileKey('audio', voiceResult.style, voiceResult.format);

    this.logger.info('Uploading files to R2', {
      scriptKey,
      audioKey,
      bucket: this.config.bucket
    });

    try {
      // 并行上传文件
      const [scriptUpload, audioUpload] = await Promise.all([
        this._uploadFile(scriptKey, scriptResult.content, 'text/plain'),
        this._uploadFile(audioKey, voiceResult.audioData, getMimeType(audioKey))
      ]);

      const storageResult = {
        scriptUrl: `${this.config.baseUrl}/${scriptKey}`,
        audioUrl: `${this.config.baseUrl}/${audioKey}`,
        scriptKey,
        audioKey,
        metadata: {
          bucket: this.config.bucket,
          region: this.config.region,
          uploadedAt: new Date().toISOString(),
          scriptSize: scriptResult.content.length,
          audioSize: voiceResult.fileSize,
          scriptUploadResult: scriptUpload,
          audioUploadResult: audioUpload
        }
      };

      this.logger.info('Files uploaded successfully', {
        scriptUrl: storageResult.scriptUrl,
        audioUrl: storageResult.audioUrl
      });

      return storageResult;

    } catch (error) {
      this.logger.error('R2 upload failed', {
        error: error.message,
        scriptKey,
        audioKey
      });
      throw error;
    }
  }

  /**
   * 上传单个文件
   * @private
   * @param {string} key - 文件键
   * @param {string|Buffer|Blob} data - 文件数据
   * @param {string} contentType - 内容类型
   * @returns {Promise<Object>} 上传结果
   */
  async _uploadFile(key, data, contentType) {
    // 验证文件大小
    const fileSize = this._getDataSize(data);
    if (!validateFileSize(fileSize, this.config.maxFileSize)) {
      throw new Error(`File too large: ${fileSize} bytes`);
    }

    // 转换数据格式
    const body = await this._convertToBuffer(data);

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // 添加缓存控制
      CacheControl: 'max-age=31536000', // 1年
      // 添加元数据
      Metadata: {
        uploadedAt: new Date().toISOString(),
        originalSize: fileSize.toString()
      }
    });

    const result = await this.client.send(command);

    return {
      etag: result.ETag,
      versionId: result.VersionId,
      size: fileSize
    };
  }

  /**
   * 获取数据大小
   * @private
   * @param {string|Buffer|Blob} data - 数据
   * @returns {number} 大小
   */
  _getDataSize(data) {
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    }
    if (data instanceof Buffer) {
      return data.length;
    }
    if (data instanceof Blob) {
      return data.size;
    }
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    return 0;
  }

  /**
   * 转换数据为Buffer
   * @private
   * @param {string|Buffer|Blob} data - 数据
   * @returns {Promise<Buffer>} Buffer数据
   */
  async _convertToBuffer(data) {
    if (typeof data === 'string') {
      return Buffer.from(data, 'utf8');
    }
    if (data instanceof Buffer) {
      return data;
    }
    if (data instanceof Blob) {
      return Buffer.from(await data.arrayBuffer());
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data);
    }
    throw new Error('Unsupported data type for upload');
  }

  /**
   * 获取文件URL
   * @param {string} fileKey - 文件键名
   * @returns {Promise<string>} 文件URL
   */
  async getFileUrl(fileKey) {
    if (!fileKey) {
      throw new Error('File key is required');
    }

    const url = `${this.config.baseUrl}/${fileKey}`;

    // 可选：检查文件是否存在
    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey,
      });

      await this.client.send(command);
      return url;
    } catch (error) {
      this.logger.warn('File not found in R2', { fileKey, error: error.message });
      throw new Error(`File not found: ${fileKey}`);
    }
  }

  /**
   * 删除文件
   * @param {string} fileKey - 文件键名
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteFile(fileKey) {
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey,
      });

      await this.client.send(command);

      this.logger.info('File deleted from R2', { fileKey });
      return true;

    } catch (error) {
      this.logger.error('Failed to delete file from R2', {
        fileKey,
        error: error.message
      });
      return false;
    }
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    try {
      if (!this.config.accessKeyId) {
        throw new Error('R2 access key ID is required');
      }
      if (!this.config.secretAccessKey) {
        throw new Error('R2 secret access key is required');
      }
      if (!this.config.bucket) {
        throw new Error('R2 bucket name is required');
      }

      // 尝试连接并列出桶内容来验证配置
      const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: this.config.region || 'auto',
        endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });

      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        MaxKeys: 1
      });

      await client.send(command);

      this.logger.info('R2 storage configuration validated successfully');
      return true;

    } catch (error) {
      this.logger.error('R2 storage configuration validation failed', error);
      return false;
    }
  }

  /**
   * 获取存储统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStorageStats() {
    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket
      });

      const result = await this.client.send(command);

      return {
        totalObjects: result.KeyCount || 0,
        contents: result.Contents || [],
        bucket: this.config.bucket
      };

    } catch (error) {
      this.logger.error('Failed to get storage stats', error);
      throw error;
    }
  }

  /**
   * 清理过期文件
   * @param {number} daysOld - 删除多少天前的文件
   * @returns {Promise<number>} 删除的文件数量
   */
  async cleanupOldFiles(daysOld = 30) {
    try {
      const stats = await this.getStorageStats();
      let deletedCount = 0;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      for (const object of stats.contents) {
        if (object.LastModified < cutoffDate) {
          await this.deleteFile(object.Key);
          deletedCount++;
        }
      }

      this.logger.info('Old files cleanup completed', {
        deletedCount,
        daysOld
      });

      return deletedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup old files', error);
      throw error;
    }
  }
}
