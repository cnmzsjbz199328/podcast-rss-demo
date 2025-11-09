/**
 * 文本分段器 - 负责将文本分割为字幕块
 */

import { safeStringOperation, safeArrayAccess } from '../../utils/errorHandling.js';

export class TextSegmenter {
  constructor(options = {}) {
    this.options = {
      maxCharsPerLine: 80,
      maxLinesPerBlock: 2,
      preferSentenceBreaks: true,
      ...options
    };
  }

  /**
   * 将文本分割为字幕块
   */
  segmentText(text) {
    if (!text || typeof text !== 'string') {
      return [''];
    }

    // 首先按句子分割
    const sentences = this._splitIntoSentences(text);

    const blocks = [];
    let currentBlock = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // 检查添加这个句子后是否超过限制
      const potentialBlock = currentBlock ? `${currentBlock} ${trimmedSentence}` : trimmedSentence;

      if (this._shouldSplitBlock(potentialBlock)) {
        // 保存当前块，开始新块
        if (currentBlock) {
          blocks.push(currentBlock.trim());
        }
        currentBlock = trimmedSentence;
      } else {
        // 添加到当前块
        currentBlock = potentialBlock;
      }
    }

    // 添加最后一个块
    if (currentBlock) {
      blocks.push(currentBlock.trim());
    }

    return blocks;
  }

  /**
   * 按句子分割文本
   */
  _splitIntoSentences(text) {
    // 使用正则表达式分割句子
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * 判断是否应该分割字幕块
   */
  _shouldSplitBlock(text) {
    const lines = this._splitIntoLines(text);
    return lines.length > this.options.maxLinesPerBlock;
  }

  /**
   * 将文本分割为行
   */
  _splitIntoLines(text) {
    if (!text || typeof text !== 'string') {
      return [''];
    }

    const words = text.split(' ').filter(word => word && typeof word === 'string');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length <= this.options.maxCharsPerLine) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}
