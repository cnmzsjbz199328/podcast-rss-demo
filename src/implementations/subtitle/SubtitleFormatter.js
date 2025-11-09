/**
 * 字幕格式化器 - 生成各种字幕格式
 */

export class SubtitleFormatter {
  /**
   * 生成 SRT 格式字幕
   */
  generateSRT(timedBlocks) {
    if (!Array.isArray(timedBlocks)) {
      return '';
    }

    const lines = [];

    for (const block of timedBlocks) {
      lines.push(block.index.toString());
      lines.push(`${this._formatTime(block.startTime)} --> ${this._formatTime(block.endTime)}`);
      lines.push(block.text || '');
      lines.push(''); // 空行
    }

    return lines.join('\n');
  }

  /**
   * 生成 VTT 格式字幕
   */
  generateVTT(timedBlocks) {
    if (!Array.isArray(timedBlocks)) {
      return 'WEBVTT\n\n';
    }

    const lines = ['WEBVTT', ''];

    for (const block of timedBlocks) {
      lines.push(`${this._formatTimeVTT(block.startTime)} --> ${this._formatTimeVTT(block.endTime)}`);
      lines.push(block.text || '');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 生成 JSON 格式转录（Apple Podcasts 逐字同步）
   */
  generateJSONTranscript(wordTimestamps) {
    if (!Array.isArray(wordTimestamps)) {
      return JSON.stringify({
        version: "1.0.0",
        type: "transcript",
        language: "en",
        segments: []
      });
    }

    const transcript = {
      version: "1.0.0",
      type: "transcript",
      language: "en",
      segments: [{
        startTime: 0,
        endTime: wordTimestamps.length > 0 ? wordTimestamps[wordTimestamps.length - 1].end : 0,
        words: wordTimestamps.map((item) => ({
          word: item.word || '',
          start: item.start || 0,
          end: item.end || 0,
          confidence: 0.95
        }))
      }]
    };

    return JSON.stringify(transcript, null, 2);
  }

  /**
   * 格式化时间为 SRT 格式 (HH:MM:SS,mmm)
   */
  _formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * 格式化时间为 VTT 格式 (HH:MM:SS.mmm)
   */
  _formatTimeVTT(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
}
