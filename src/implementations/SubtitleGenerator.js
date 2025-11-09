/**
 * 字幕生成器 - 生成 SRT、VTT 和 JSON 格式的字幕文件
 * 重构版：使用组合模式，职责分离，保持文件大小在200行以内
 */

import { TextSegmenter } from './subtitle/TextSegmenter.js';
import { TimestampGenerator } from './subtitle/TimestampGenerator.js';
import { SubtitleFormatter } from './subtitle/SubtitleFormatter.js';
import { safeExecute, validateProperty } from '../utils/errorHandling.js';

export class SubtitleGenerator {
  constructor(options = {}) {
    this.logger = { info: console.log, error: console.error, debug: console.debug };

    // 初始化组件
    this.segmenter = new TextSegmenter(options);
    this.timestampGenerator = new TimestampGenerator(options);
    this.formatter = new SubtitleFormatter();
  }

  /**
   * 生成字幕文件
   * @param {string} scriptText - 脚本文本
   * @param {number} durationSeconds - 音频时长（秒）
   * @param {Object} options - 生成选项
   * @returns {Object} 包含多种格式的字幕对象
   */
  generateSubtitles(scriptText, durationSeconds, options = {}) {
    return safeExecute(() => {
      const { wordsPerMinute = 150, isChunked = false } = options;

      this.logger.info('Generating subtitles and transcripts', {
        scriptLength: scriptText?.length || 0,
        durationSeconds,
        wordsPerMinute,
        isChunked
      });

      // 验证输入参数
      if (!validateProperty({ scriptText }, 'scriptText', 'string')) {
        throw new Error('Invalid script text provided');
      }

      if (!validateProperty({ durationSeconds }, 'durationSeconds', 'number') || durationSeconds <= 0) {
        throw new Error('Invalid duration provided');
      }

      // 分割文本为字幕块
      const subtitleBlocks = this.segmenter.segmentText(scriptText);

      // 为字幕块分配时间戳
      const timedBlocks = this.timestampGenerator.assignTimestamps(subtitleBlocks, durationSeconds);

      // 生成逐字时间戳
      const wordTimestamps = this.timestampGenerator.generateWordTimestamps(scriptText, durationSeconds);

      // 生成各种格式
      const srtContent = this.formatter.generateSRT(timedBlocks);
      const vttContent = this.formatter.generateVTT(timedBlocks);
      const jsonContent = this.formatter.generateJSONTranscript(wordTimestamps);

      this.logger.info('Subtitles and transcripts generated successfully', {
        blockCount: timedBlocks.length,
        wordCount: wordTimestamps.length,
        srtSize: srtContent.length,
        vttSize: vttContent.length,
        jsonSize: jsonContent.length
      });

      return {
        srt: srtContent,
        vtt: vttContent,
        json: jsonContent,
        blocks: timedBlocks,
        words: wordTimestamps,
        metadata: {
          totalBlocks: timedBlocks.length,
          totalWords: wordTimestamps.length,
          totalDuration: durationSeconds,
          wordsPerMinute,
          isChunked,
          generatedAt: new Date().toISOString()
        }
      };
    }, null, 'SubtitleGenerator.generateSubtitles');
  }
}
