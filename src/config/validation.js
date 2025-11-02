/**
 * 配置验证
 */

import { validateApiKey, validateUrl, validateStyleConfig } from '../utils/validator.js';
import { Logger } from '../utils/logger.js';

/**
 * 验证完整配置
 * @param {Object} config - 配置对象
 * @returns {ValidationResult} 验证结果
 */
export function validateFullConfig(config) {
  const logger = new Logger('ConfigValidator');
  const errors = [];
  const warnings = [];

  try {
    // 验证应用配置
    validateAppConfig(config.app, errors, warnings);

    // 验证服务配置
    validateServicesConfig(config.services, errors, warnings);

    // 验证风格配置
    validateStylesConfig(config.styles, errors, warnings);

    // 验证生成配置
    validateGenerationConfig(config.generation, errors, warnings);

    const isValid = errors.length === 0;

    logger.info('Configuration validation completed', {
      isValid,
      errorsCount: errors.length,
      warningsCount: warnings.length
    });

    return {
      isValid,
      errors,
      warnings
    };

  } catch (error) {
    logger.error('Configuration validation failed', error);
    return {
      isValid: false,
      errors: [`Validation error: ${error.message}`],
      warnings: []
    };
  }
}

/**
 * 验证应用配置
 * @param {Object} appConfig - 应用配置
 * @param {string[]} errors - 错误列表
 * @param {string[]} warnings - 警告列表
 */
function validateAppConfig(appConfig, errors, warnings) {
  if (!appConfig.name || typeof appConfig.name !== 'string') {
    errors.push('App name is required and must be a string');
  }

  if (!appConfig.version || typeof appConfig.version !== 'string') {
    errors.push('App version is required and must be a string');
  }

  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(appConfig.env)) {
    warnings.push(`App environment should be one of: ${validEnvs.join(', ')}`);
  }
}

/**
 * 验证服务配置
 * @param {Object} servicesConfig - 服务配置
 * @param {string[]} errors - 错误列表
 * @param {string[]} warnings - 警告列表
 */
function validateServicesConfig(servicesConfig, errors, warnings) {
  // RSS服务验证
  if (servicesConfig.rss) {
    if (!validateUrl(servicesConfig.rss.url)) {
      errors.push('Invalid RSS URL');
    }

    if (servicesConfig.rss.timeout && servicesConfig.rss.timeout < 1000) {
      warnings.push('RSS timeout is very low (< 1s)');
    }
  }

  // 脚本服务验证
  if (servicesConfig.script) {
    if (!validateApiKey(servicesConfig.script.apiKey)) {
      errors.push('Invalid or missing script API key');
    }

    const validProviders = ['gemini', 'claude', 'openai'];
    if (!validProviders.includes(servicesConfig.script.provider)) {
      warnings.push(`Script provider should be one of: ${validProviders.join(', ')}`);
    }
  }

  // 语音服务验证
  if (servicesConfig.voice) {
    const validProviders = ['indextts', 'elevenlabs', 'azure'];
    if (!validProviders.includes(servicesConfig.voice.provider)) {
      warnings.push(`Voice provider should be one of: ${validProviders.join(', ')}`);
    }
  }

  // 存储服务验证
  if (servicesConfig.storage) {
    const validProviders = ['r2', 's3', 'local'];
    if (!validProviders.includes(servicesConfig.storage.provider)) {
      warnings.push(`Storage provider should be one of: ${validProviders.join(', ')}`);
    }

    if (servicesConfig.storage.provider === 'r2') {
      if (!servicesConfig.storage.accessKeyId) {
        errors.push('R2 access key ID is required');
      }
      if (!servicesConfig.storage.secretAccessKey) {
        errors.push('R2 secret access key is required');
      }
    }
  }
}

/**
 * 验证风格配置
 * @param {Object} stylesConfig - 风格配置
 * @param {string[]} errors - 错误列表
 * @param {string[]} warnings - 警告列表
 */
function validateStylesConfig(stylesConfig, errors, warnings) {
  if (!stylesConfig || Object.keys(stylesConfig).length === 0) {
    errors.push('At least one style configuration is required');
    return;
  }

  for (const [styleName, style] of Object.entries(stylesConfig)) {
    if (!validateStyleConfig(style)) {
      errors.push(`Invalid style configuration: ${styleName}`);
    }

    // 检查必需字段
    if (!style.scriptPrompt || !style.scriptPrompt.includes('{news}')) {
      warnings.push(`Style ${styleName} script prompt should contain {news} placeholder`);
    }

    // 检查参数范围
    if (style.params) {
      if (style.params.emo_weight !== undefined &&
          (style.params.emo_weight < 0 || style.params.emo_weight > 1)) {
        warnings.push(`Style ${styleName} emo_weight should be between 0 and 1`);
      }
    }
  }
}

/**
 * 验证生成配置
 * @param {Object} generationConfig - 生成配置
 * @param {string[]} errors - 错误列表
 * @param {string[]} warnings - 警告列表
 */
function validateGenerationConfig(generationConfig, errors, warnings) {
  if (generationConfig.maxRetries && generationConfig.maxRetries > 10) {
    warnings.push('Max retries is very high (> 10)');
  }

  if (generationConfig.timeout && generationConfig.timeout < 30000) {
    warnings.push('Generation timeout is very low (< 30s)');
  }

  if (generationConfig.concurrency && generationConfig.concurrency > 5) {
    warnings.push('High concurrency may cause API rate limits');
  }
}

/**
 * 验证结果类型
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - 是否有效
 * @property {string[]} errors - 错误列表
 * @property {string[]} warnings - 警告列表
 */
