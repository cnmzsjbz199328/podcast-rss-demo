/**
 * 字幕服务接口
 * 定义字幕生成的标准化方法
 */

export class ISubtitleService {
  /**
   * 生成字幕文件
   * @param {string} scriptText - 脚本文本
   * @param {number} durationSeconds - 音频时长（秒）
   * @param {Object} options - 生成选项
   * @returns {Promise<SubtitleResult>} 字幕生成结果
   */
  async generateSubtitles(scriptText, durationSeconds, options = {}) {
    throw new Error('Method generateSubtitles not implemented');
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    throw new Error('Method validateConfig not implemented');
  }
}

/**
 * 字幕生成结果接口
 * @typedef {Object} SubtitleResult
 * @property {string} srt - SRT格式字幕内容
 * @property {string} vtt - VTT格式字幕内容
 * @property {string} json - JSON格式转录内容
 * @property {Array} blocks - 字幕块数组
 * @property {Array} words - 逐字时间戳数组
 * @property {Object} metadata - 元数据
 */

/**
 * 字幕块接口
 * @typedef {Object} SubtitleBlock
 * @property {number} index - 块索引
 * @property {string} text - 字幕文本
 * @property {number} startTime - 开始时间（秒）
 * @property {number} endTime - 结束时间（秒）
 */

/**
 * 逐字时间戳接口
 * @typedef {Object} WordTimestamp
 * @property {string} word - 单词
 * @property {number} start - 开始时间（秒）
 * @property {number} end - 结束时间（秒）
 */
