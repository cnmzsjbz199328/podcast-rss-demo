/**
 * 重试工具
 */

/**
 * 重试配置
 * @typedef {Object} RetryOptions
 * @property {number} maxAttempts - 最大重试次数
 * @property {number} initialDelay - 初始延迟(ms)
 * @property {number} maxDelay - 最大延迟(ms)
 * @property {number} backoffFactor - 退避因子
 * @property {Function} shouldRetry - 判断是否重试的函数
 */

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error) => {
    // 默认重试网络错误和服务器错误
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND' ||
           (error.status >= 500 && error.status < 600);
  }
};

/**
 * 计算延迟时间
 * @param {number} attempt - 当前尝试次数
 * @param {RetryOptions} options - 重试配置
 * @returns {number} 延迟时间(ms)
 */
function calculateDelay(attempt, options) {
  const delay = options.initialDelay * Math.pow(options.backoffFactor, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * 延迟执行
 * @param {number} ms - 延迟时间(ms)
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试执行函数
 * @param {Function} fn - 要执行的函数
 * @param {RetryOptions} options - 重试配置
 * @param {Logger} logger - 日志实例
 * @returns {Promise<*>} 执行结果
 */
export async function withRetry(fn, options = {}, logger = null) {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      if (logger) {
        logger.warn(`Attempt ${attempt} failed`, {
          error: error.message,
          attempt,
          maxAttempts: config.maxAttempts
        });
      }

      // 检查是否应该重试
      if (attempt < config.maxAttempts && config.shouldRetry(error)) {
        const delayMs = calculateDelay(attempt, config);
        if (logger) {
          logger.info(`Retrying in ${delayMs}ms...`);
        }
        await delay(delayMs);
      } else {
        break;
      }
    }
  }

  throw lastError;
}

/**
 * 重试装饰器（简化版，用于类方法）
 * @param {RetryOptions} options - 重试配置
 * @returns {Function} 装饰器函数
 */
export function retryable(options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const logger = this.logger || console;
      return withRetry(
        () => originalMethod.apply(this, args),
        options,
        logger
      );
    };

    return descriptor;
  };
}

/**
 * 指数退避延迟
 * @param {number} attempt - 尝试次数
 * @param {number} baseDelay - 基础延迟
 * @param {number} maxDelay - 最大延迟
 * @returns {number} 计算后的延迟
 */
export function exponentialBackoff(attempt, baseDelay = 1000, maxDelay = 30000) {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * 线性退避延迟
 * @param {number} attempt - 尝试次数
 * @param {number} baseDelay - 基础延迟
 * @returns {number} 计算后的延迟
 */
export function linearBackoff(attempt, baseDelay = 1000) {
  return baseDelay * attempt;
}

/**
 * 固定延迟
 * @param {number} delay - 固定延迟
 * @returns {number} 延迟时间
 */
export function fixedDelay(delay = 1000) {
  return delay;
}
