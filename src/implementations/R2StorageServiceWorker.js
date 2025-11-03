/**
 * R2 存储服务 - Worker 绑定版本
 * 使用 Cloudflare Worker 的 R2 绑定而不是 S3 SDK
 */

import { Logger } from '../utils/logger.js';
import { generateFileKey, getMimeType } from '../utils/fileUtils.js';

export class R2StorageServiceWorker {
  /**
   * @param {R2Bucket} bucket - Cloudflare R2 bucket 绑定
   * @param {string} baseUrl - R2 公开访问的基础 URL
   */
  constructor(bucket, baseUrl) {
    this.bucket = bucket;
    this.baseUrl = baseUrl;
    this.logger = new Logger('R2StorageServiceWorker');
  }

  /**
   * 存储脚本和音频文件
   */
  async storeFiles(scriptResult, voiceResult) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    // 生成文件键
    const scriptKey = generateFileKey('scripts', voiceResult.style, 'txt', timestamp);

    this.logger.info('Uploading script to R2', { scriptKey });

    try {
      // 上传脚本文件
      await this.bucket.put(scriptKey, scriptResult.content, {
        httpMetadata: {
          contentType: 'text/plain; charset=utf-8',
          cacheControl: 'public, max-age=31536000',  // 1年缓存
        },
        customMetadata: {
          type: 'script',
          style: scriptResult.style,
          uploadedAt: new Date().toISOString()
        }
      });

      const storageResult = {
        scriptUrl: `${this.baseUrl}/${scriptKey}`,
        scriptKey,
        metadata: {
          uploadedAt: new Date().toISOString(),
          scriptSize: scriptResult.content.length
        }
      };

      // 如果音频是异步生成，不上传音频
      if (voiceResult.isAsync || !voiceResult.audioData) {
        this.logger.info('Async audio generation - skipping audio upload', { 
          isAsync: voiceResult.isAsync,
          hasAudioData: !!voiceResult.audioData 
        });
        
        return {
          ...storageResult,
          audioUrl: null,
          audioKey: null
        };
      }

      // 同步生成，上传音频文件
      const audioKey = generateFileKey('audio', voiceResult.style, voiceResult.format, timestamp);
      this.logger.info('Uploading audio to R2', { audioKey });

      const audioData = await this._prepareAudioData(voiceResult.audioData);
      await this.bucket.put(audioKey, audioData, {
        httpMetadata: {
          contentType: getMimeType(audioKey),
          cacheControl: 'public, max-age=31536000',
        },
        customMetadata: {
          type: 'audio',
          style: voiceResult.style,
          duration: voiceResult.duration?.toString() || '0',
          uploadedAt: new Date().toISOString()
        }
      });

      storageResult.audioUrl = `${this.baseUrl}/${audioKey}`;
      storageResult.audioKey = audioKey;
      storageResult.metadata.audioSize = voiceResult.fileSize;

      this.logger.info('Files uploaded successfully', {
        scriptUrl: storageResult.scriptUrl,
        audioUrl: storageResult.audioUrl
      });

      return storageResult;

    } catch (error) {
      this.logger.error('R2 upload failed', {
        error: error.message,
        scriptKey
      });
      throw error;
    }
  }

  /**
   * 准备音频数据用于上传
   */
  async _prepareAudioData(audioData) {
    // 如果是 Blob
    if (audioData instanceof Blob) {
      return await audioData.arrayBuffer();
    }

    // 如果是 ArrayBuffer
    if (audioData instanceof ArrayBuffer) {
      return audioData;
    }

    // 如果是 Buffer (Node.js)
    if (audioData && audioData.buffer) {
      return audioData.buffer;
    }

    // 如果是 ReadableStream
    if (audioData && audioData.getReader) {
      const reader = audioData.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result.buffer;
    }

    throw new Error('Unsupported audio data type');
  }

  /**
   * 获取文件
   */
  async getFile(fileKey) {
    try {
      const object = await this.bucket.get(fileKey);

      if (!object) {
        return null;
      }

      return {
        key: object.key,
        body: object.body,
        size: object.size,
        uploaded: object.uploaded,
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata
      };

    } catch (error) {
      this.logger.error('Failed to get file from R2', { fileKey, error: error.message });
      return null;
    }
  }

  /**
   * 获取文件元数据（不下载文件体）
   */
  async getFileMetadata(fileKey) {
    try {
      const object = await this.bucket.head(fileKey);

      if (!object) {
        return null;
      }

      return {
        key: object.key,
        size: object.size,
        uploaded: object.uploaded,
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata
      };

    } catch (error) {
      this.logger.error('Failed to get file metadata', { fileKey, error: error.message });
      return null;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileKey) {
    try {
      await this.bucket.delete(fileKey);
      this.logger.info('File deleted from R2', { fileKey });
      return true;

    } catch (error) {
      this.logger.error('Failed to delete file', { fileKey, error: error.message });
      return false;
    }
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(fileKeys) {
    try {
      await this.bucket.delete(fileKeys);
      this.logger.info('Files deleted from R2', { count: fileKeys.length });
      return true;

    } catch (error) {
      this.logger.error('Failed to delete files', { count: fileKeys.length, error: error.message });
      return false;
    }
  }

  /**
   * 列出文件
   */
  async listFiles(options = {}) {
    try {
      const result = await this.bucket.list({
        limit: options.limit || 1000,
        prefix: options.prefix,
        cursor: options.cursor,
        delimiter: options.delimiter
      });

      return {
        objects: result.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          httpMetadata: obj.httpMetadata,
          customMetadata: obj.customMetadata
        })),
        truncated: result.truncated,
        cursor: result.cursor,
        delimitedPrefixes: result.delimitedPrefixes || []
      };

    } catch (error) {
      this.logger.error('Failed to list files', error);
      throw error;
    }
  }

  /**
   * 获取文件 URL
   */
  getFileUrl(fileKey) {
    return `${this.baseUrl}/${fileKey}`;
  }

  /**
   * 获取存储统计
   */
  async getStatistics() {
    try {
      const audioList = await this.listFiles({ prefix: 'audio/', limit: 1000 });
      const scriptList = await this.listFiles({ prefix: 'scripts/', limit: 1000 });

      const totalAudioSize = audioList.objects.reduce((sum, obj) => sum + obj.size, 0);
      const totalScriptSize = scriptList.objects.reduce((sum, obj) => sum + obj.size, 0);

      return {
        audioFiles: audioList.objects.length,
        scriptFiles: scriptList.objects.length,
        totalFiles: audioList.objects.length + scriptList.objects.length,
        audioSize: totalAudioSize,
        scriptSize: totalScriptSize,
        totalSize: totalAudioSize + totalScriptSize
      };

    } catch (error) {
      this.logger.error('Failed to get statistics', error);
      return {
        audioFiles: 0,
        scriptFiles: 0,
        totalFiles: 0,
        audioSize: 0,
        scriptSize: 0,
        totalSize: 0
      };
    }
  }
}
