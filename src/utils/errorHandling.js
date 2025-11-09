/**
 * 错误处理和防御性编程工具
 */

import { Logger } from './logger.js';

const logger = new Logger('ErrorHandling');

/**
 * 安全执行函数，添加错误边界
 */
export function safeExecute(fn, fallback = null, context = 'unknown') {
  try {
    return fn();
  } catch (error) {
    logger.error(`Safe execute failed in ${context}`, {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    return fallback;
  }
}

/**
 * 验证对象属性是否存在且不为null/undefined
 */
export function validateProperty(obj, propertyPath, type = null) {
  try {
    const value = propertyPath.split('.').reduce((current, key) => current?.[key], obj);

    if (value == null) {
      return false;
    }

    if (type && typeof value !== type) {
      logger.warn(`Property ${propertyPath} type mismatch`, {
        expected: type,
        actual: typeof value,
        value
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`Property validation failed for ${propertyPath}`, error);
    return false;
  }
}

/**
 * 安全访问数组元素
 */
export function safeArrayAccess(array, index, fallback = null) {
  if (!Array.isArray(array)) {
    logger.warn('safeArrayAccess called with non-array', { type: typeof array });
    return fallback;
  }

  if (index < 0 || index >= array.length) {
    logger.warn('Array index out of bounds', { index, length: array.length });
    return fallback;
  }

  return array[index];
}

/**
 * 安全字符串操作
 */
export function safeStringOperation(str, operation, ...args) {
  if (typeof str !== 'string') {
    logger.warn('safeStringOperation called with non-string', { type: typeof str });
    return '';
  }

  try {
    return str[operation](...args);
  } catch (error) {
    logger.error(`String operation ${operation} failed`, error);
    return '';
  }
}

/**
 * 创建防御性对象，自动验证属性
 */
export function createDefensiveObject(schema) {
  return new Proxy({}, {
    get(target, property) {
      if (property in target) {
        return target[property];
      }

      if (property in schema) {
        const def = schema[property];
        logger.warn(`Accessing undefined property: ${property}, returning default`, { default: def });
        return def;
      }

      logger.error(`Accessing unknown property: ${property}`);
      return undefined;
    },

    set(target, property, value) {
      if (property in schema) {
        const expectedType = typeof schema[property];
        const actualType = typeof value;

        if (expectedType !== 'undefined' && actualType !== expectedType) {
          logger.warn(`Type mismatch for property ${property}`, {
            expected: expectedType,
            actual: actualType,
            value
          });
        }
      }

      target[property] = value;
      return true;
    }
  });
}

/**
 * 包装异步函数，添加错误恢复
 */
export function withErrorRecovery(fn, recoveryFn = null) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error('Function execution failed, attempting recovery', {
        error: error.message,
        recoveryFn: !!recoveryFn
      });

      if (recoveryFn) {
        try {
          return await recoveryFn(error, ...args);
        } catch (recoveryError) {
          logger.error('Recovery function also failed', recoveryError);
        }
      }

      throw error;
    }
  };
}

/**
 * 验证服务接口
 */
export function validateServiceInterface(service, requiredMethods) {
  const missingMethods = requiredMethods.filter(method => typeof service[method] !== 'function');

  if (missingMethods.length > 0) {
    const error = new Error(`Service interface validation failed. Missing methods: ${missingMethods.join(', ')}`);
    logger.error('Service interface validation failed', { missingMethods });
    throw error;
  }

  logger.debug('Service interface validation passed', { methods: requiredMethods });
  return true;
}
