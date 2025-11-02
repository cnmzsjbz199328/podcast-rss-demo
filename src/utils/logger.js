/**
 * 日志工具类
 * 提供结构化日志记录功能
 */
export class Logger {
  /**
   * 创建日志实例
   * @param {string} context - 日志上下文
   */
  constructor(context) {
    this.context = context;
  }

  /**
   * 记录信息日志
   * @param {string} message - 日志消息
   * @param {Object} data - 额外数据
   */
  info(message, data = {}) {
    this._log('info', message, data);
  }

  /**
   * 记录警告日志
   * @param {string} message - 日志消息
   * @param {Object} data - 额外数据
   */
  warn(message, data = {}) {
    this._log('warn', message, data);
  }

  /**
   * 记录错误日志
   * @param {string} message - 日志消息
   * @param {Error|Object} error - 错误对象
   */
  error(message, error = {}) {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    this._log('error', message, errorData);
  }

  /**
   * 记录调试日志
   * @param {string} message - 日志消息
   * @param {Object} data - 额外数据
   */
  debug(message, data = {}) {
    this._log('debug', message, data);
  }

  /**
   * 内部日志记录方法
   * @private
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} data - 额外数据
   */
  _log(level, message, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...data
    };

    const output = JSON.stringify(logEntry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(output);
        }
        break;
      default:
        console.log(output);
    }
  }
}

/**
 * 创建日志实例的工厂函数
 * @param {string} context - 日志上下文
 * @returns {Logger} 日志实例
 */
export function createLogger(context) {
  return new Logger(context);
}
