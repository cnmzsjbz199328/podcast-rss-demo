/** 限制：每个文件不超过200行，当前行数：89行 */
/**
 * R2文件上传器 - 专门负责文件上传逻辑
 */

import { Logger } from '../utils/logger.js';
import { generateFileKey, getMimeType } from '../utils/fileUtils.js';

export class R2FileUploader {
  constructor(bucket, baseUrl) {
    this.bucket = bucket;
    this.baseUrl = baseUrl;
    this.logger = new Logger('R2FileUploader');
  }

  /**
   * 上传脚本文件
   */
  async uploadScript(scriptResult, episodeId) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const scriptKey = generateFileKey('scripts', scriptResult.style, 'txt', timestamp);

    this.logger.info('Uploading script to R2', { scriptKey });

    await this.bucket.put(scriptKey, scriptResult.content, {
      httpMetadata: {
        contentType: 'text/plain; charset=utf-8',
        cacheControl: 'public, max-age=31536000', // 1年缓存
      },
      customMetadata: {
        type: 'script',
        style: scriptResult.style,
        uploadedAt: new Date().toISOString(),
        episodeId
      }
    });

    const scriptUrl = `${this.baseUrl}/${scriptKey}`;

    return {
      scriptUrl,
      scriptKey,
      scriptSize: scriptResult.content.length
    };
  }

  /**
  * 上传音频文件
  */
  async uploadAudio(audioData, voiceResult, episodeId) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const audioKey = generateFileKey('audio', voiceResult.style, 'mp3', timestamp);

  this.logger.info('Uploading audio to R2', { audioKey });

  await this.bucket.put(audioKey, audioData, {
  httpMetadata: {
  contentType: getMimeType(audioKey),
  cacheControl: 'public, max-age=31536000', // 1年缓存
  },
  customMetadata: {
  type: 'audio',
  style: voiceResult.style,
  duration: voiceResult.duration || 0,
  uploadedAt: new Date().toISOString(),
  episodeId
  }
  });

  const audioUrl = `${this.baseUrl}/${audioKey}`;

  return {
  audioUrl,
  audioKey,
  fileSize: audioData.byteLength
  };
  }

  /**
   * 上传字幕文件
   */
  async uploadSubtitles(subtitleResult, episodeId, style) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    // 上传 SRT 格式
    const srtKey = generateFileKey('subtitles', style, 'srt', timestamp);
    this.logger.info('Uploading SRT subtitle to R2', { srtKey });

    await this.bucket.put(srtKey, subtitleResult.srt, {
      httpMetadata: {
        contentType: 'text/plain; charset=utf-8',
        cacheControl: 'public, max-age=31536000', // 1年缓存
      },
      customMetadata: {
        type: 'subtitle',
        format: 'srt',
        style: style,
        totalBlocks: subtitleResult.metadata.totalBlocks,
        totalDuration: subtitleResult.metadata.totalDuration,
        uploadedAt: new Date().toISOString(),
        episodeId
      }
    });

    // 上传 VTT 格式
    const vttKey = generateFileKey('subtitles', style, 'vtt', timestamp);
    this.logger.info('Uploading VTT subtitle to R2', { vttKey });

    await this.bucket.put(vttKey, subtitleResult.vtt, {
    httpMetadata: {
    contentType: 'text/vtt; charset=utf-8',
    cacheControl: 'public, max-age=31536000', // 1年缓存
    },
    customMetadata: {
    type: 'subtitle',
    format: 'vtt',
    style: style,
    totalBlocks: subtitleResult.metadata.totalBlocks,
    totalDuration: subtitleResult.metadata.totalDuration,
    uploadedAt: new Date().toISOString(),
    episodeId
    }
    });

    // 上传 JSON 格式（逐字同步转录）
    const jsonKey = generateFileKey('transcripts', style, 'json', timestamp);
    this.logger.info('Uploading JSON transcript to R2', { jsonKey });

    await this.bucket.put(jsonKey, subtitleResult.json, {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
      cacheControl: 'public, max-age=31536000', // 1年缓存
    },
    customMetadata: {
      type: 'transcript',
        format: 'json',
        style: style,
        totalWords: subtitleResult.metadata.totalWords,
        totalDuration: subtitleResult.metadata.totalDuration,
        uploadedAt: new Date().toISOString(),
        episodeId
      }
    });

    const srtUrl = `${this.baseUrl}/${srtKey}`;
    const vttUrl = `${this.baseUrl}/${vttKey}`;
    const jsonUrl = `${this.baseUrl}/${jsonKey}`;

    return {
      srtUrl,
      vttUrl,
      jsonUrl,
      srtKey,
      vttKey,
      jsonKey,
      srtSize: subtitleResult.srt.length,
      vttSize: subtitleResult.vtt.length,
      jsonSize: subtitleResult.json.length,
      blockCount: subtitleResult.metadata.totalBlocks,
      wordCount: subtitleResult.metadata.totalWords
    };
  }
}
