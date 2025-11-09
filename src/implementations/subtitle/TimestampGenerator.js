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
      const duration = Math.min(this.options.subtitleDuration, totalDuration - startTime);
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
   * 生成逐字时间戳（用于Apple Podcasts同步转录）
   */
  generateWordTimestamps(text, durationSeconds) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const words = text.split(/\s+/).filter(word => word && typeof word === 'string');
    const secondsPerWord = 60 / this.options.wordsPerMinute;

    const wordTimestamps = [];
    let currentTime = 0;

    for (const word of words) {
      const startTime = currentTime;
      const endTime = Math.min(startTime + secondsPerWord, durationSeconds);

      wordTimestamps.push({
        word: word,
        start: startTime,
        end: endTime
      });

      currentTime = endTime;

      // 防止超过总时长
      if (currentTime >= durationSeconds) break;
    }

    return wordTimestamps;
  }
}
