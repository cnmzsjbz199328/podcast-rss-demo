/**
 * 时间戳生成器 - 为字幕块生成精确的时间戳
 */

export class TimestampGenerator {
  constructor(options = {}) {
    this.options = {
      subtitleDuration: 3.0,
      overlap: 0.5,
      wordsPerMinute: 150,
      ...options
    };
  }

  /**
  * 为字幕块分配时间戳
  */
  assignTimestamps(blocks, totalDuration) {
  const timedBlocks = [];
  let currentTime = 0;

  for (let i = 0; i < blocks.length; i++) {
  const block = blocks[i];
  const startTime = currentTime;

  // 计算块的估算时长，考虑句子边界停顿
      const blockDuration = this._calculateBlockDuration(block);
  const duration = Math.min(blockDuration, totalDuration - startTime);
  const endTime = Math.min(startTime + duration, totalDuration);

  timedBlocks.push({
  index: i + 1,
    text: block,
        startTime,
    endTime
      });

  currentTime = endTime - this.options.overlap;

      // 防止超过总时长
    if (currentTime >= totalDuration) break;
    }

    return timedBlocks;
  }

  /**
   * 计算字幕块的时长，考虑文本特征
   * @private
   */
  _calculateBlockDuration(block) {
    if (!block || typeof block !== 'string') {
      return this.options.subtitleDuration;
    }

    const words = block.split(/\s+/).filter(word => word);
    const wordCount = words.length;
    const baseDuration = (wordCount * 60) / this.options.wordsPerMinute;

    // 检测句子数量并添加停顿
    const sentenceCount = (block.match(/[.!?]+/g) || []).length;
    const sentencePauses = sentenceCount * 0.5; // 每个句子结束0.5秒

    // 检测短暂停顿
    const shortPauseCount = (block.match(/[,;:—]+/g) || []).length;
    const shortPauses = shortPauseCount * 0.2;

    return Math.max(baseDuration + sentencePauses + shortPauses, 1.0); // 最少1秒
  }

  /**
  * 生成逐字时间戳（用于Apple Podcasts同步转录）
  */
  generateWordTimestamps(text, durationSeconds) {
  if (!text || typeof text !== 'string') {
  return [];
  }

  const words = text.split(/\s+/).filter(word => word && typeof word === 'string');
  const baseSecondsPerWord = 60 / this.options.wordsPerMinute;

  const wordTimestamps = [];
  let currentTime = 0;

  for (let i = 0; i < words.length; i++) {
  const word = words[i];
  const startTime = currentTime;

  // 基础单词时长
  let wordDuration = baseSecondsPerWord;

  // 检查标点符号并添加停顿
  const pauseDuration = this._getPauseDuration(word);
      wordDuration += pauseDuration;

      const endTime = Math.min(startTime + wordDuration, durationSeconds);

  wordTimestamps.push({
      word: word.replace(/[.,!?;:]$/, ''), // 移除标点用于显示
        start: startTime,
      end: endTime
      });

      currentTime = endTime;

      // 防止超过总时长
      if (currentTime >= durationSeconds) break;
    }

    return wordTimestamps;
  }

  /**
   * 根据标点符号计算停顿时长
   * @private
   */
  _getPauseDuration(word) {
    // 检查单词末尾的标点符号
    if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
      return 0.5; // 句子结束停顿
    } else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
      return 0.2; // 短暂停顿
    } else if (word.endsWith('...') || word.endsWith('—')) {
      return 0.3; // 中等停顿
    }
    return 0; // 无停顿
  }
}
