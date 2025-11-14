/** 限制：每个文件不超过200行，当前行数：67行 */
/**
 * 脚本格式化器 - 负责脚本的清理、格式化和统计
 */

import { Logger } from '../../utils/logger.js';

export class ScriptFormatter {
  constructor() {
    this.logger = new Logger('ScriptFormatter');
  }

  /**
   * 清理和格式化脚本
   */
  cleanAndFormatScript(script) {
    if (!script) return '';

    return script
      .trim()
      // 移除多余的空白行
      .replace(/\n{3,}/g, '\n\n')
      // 确保段落格式
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');
  }

  /**
   * 计算字数
   */
  countWords(text) {
    if (!text) return 0;

    // 中英文混合计数
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text.split(/\s+/).filter(word => word.length > 0).length;

    return chineseChars + englishWords;
  }

  /**
   * 获取脚本统计信息
   */
  getScriptStats(script) {
    const cleaned = this.cleanAndFormatScript(script);
    const wordCount = this.countWords(cleaned);
    const lineCount = cleaned.split('\n').length;
    const charCount = cleaned.length;

    return {
      wordCount,
      lineCount,
      charCount,
      avgWordsPerLine: lineCount > 0 ? Math.round(wordCount / lineCount) : 0
    };
  }

  /**
   * 验证脚本质量
   */
  validateScript(script) {
    if (!script || script.trim().length === 0) {
      return { valid: false, reason: 'Script is empty' };
    }

    const stats = this.getScriptStats(script);

    if (stats.wordCount < 50) {
      return { valid: false, reason: 'Script is too short' };
    }

    if (stats.wordCount > 2000) {
      return { valid: false, reason: 'Script is too long' };
    }

    return { valid: true, stats };
  }
}
