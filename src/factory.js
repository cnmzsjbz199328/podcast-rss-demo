/**
 * 服务工厂
 * 统一创建和配置所有服务实例
 */

import { BbcRssService } from './implementations/BbcRssService.js';
import { GeminiScriptService } from './implementations/GeminiScriptService.js';
import { IndexTtsVoiceService } from './implementations/IndexTtsVoiceService.js';
import { R2StorageService } from './implementations/R2StorageService.js';
import { loadConfig } from './config/index.js';
import { Logger } from './utils/logger.js';

/**
 * 创建所有服务实例
 * @param {Object} overrideConfig - 覆盖配置
 * @returns {Object} 服务实例集合
 */
export function createServices(overrideConfig = {}) {
  const logger = new Logger('ServiceFactory');

  try {
    // 加载配置
    const baseConfig = loadConfig();

    // 合并覆盖配置
    const config = mergeConfigs(baseConfig, overrideConfig);

    logger.info('Creating services', {
      rssProvider: config.services.rss ? 'bbc' : 'unknown',
      scriptProvider: config.services.script?.provider || 'unknown',
      voiceProvider: config.services.voice?.provider || 'unknown',
      storageProvider: config.services.storage?.provider || 'unknown'
    });

    // 创建服务实例
    const services = {
      rssService: createRssService(config.services.rss),
      scriptService: createScriptService(config.services.script),
      voiceService: createVoiceService(config.services.voice),
      storageService: createStorageService(config.services.storage)
    };

    // 注入依赖关系
    injectDependencies(services, config);

    logger.info('All services created successfully');
    return services;

  } catch (error) {
    logger.error('Failed to create services', error);
    throw error;
  }
}

/**
 * 创建RSS服务
 * @param {Object} config - RSS配置
 * @returns {IRssService} RSS服务实例
 */
function createRssService(config) {
  if (!config) {
    throw new Error('RSS service configuration is required');
  }

  // 目前只支持BBC RSS
  return new BbcRssService(config);
}

/**
 * 创建脚本服务
 * @param {Object} config - 脚本配置
 * @returns {IScriptService} 脚本服务实例
 */
function createScriptService(config) {
  if (!config) {
    throw new Error('Script service configuration is required');
  }

  const provider = config.provider || 'gemini';

  switch (provider) {
    case 'gemini':
      return new GeminiScriptService(config);
    default:
      throw new Error(`Unsupported script provider: ${provider}`);
  }
}

/**
 * 创建语音服务
 * @param {Object} config - 语音配置
 * @returns {IVoiceService} 语音服务实例
 */
function createVoiceService(config) {
  if (!config) {
    throw new Error('Voice service configuration is required');
  }

  const provider = config.provider || 'indextts';

  switch (provider) {
    case 'indextts':
      return new IndexTtsVoiceService(config);
    default:
      throw new Error(`Unsupported voice provider: ${provider}`);
  }
}

/**
 * 创建存储服务
 * @param {Object} config - 存储配置
 * @returns {IStorageService} 存储服务实例
 */
function createStorageService(config) {
  if (!config) {
    throw new Error('Storage service configuration is required');
  }

  const provider = config.provider || 'r2';

  switch (provider) {
    case 'r2':
      return new R2StorageService(config);
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
}

/**
 * 注入服务间的依赖关系
 * @param {Object} services - 服务实例集合
 * @param {Object} config - 配置对象
 */
function injectDependencies(services, config) {
  // 如果语音服务需要访问存储服务来获取样本文件
  if (services.voiceService && services.storageService) {
    services.voiceService.storageService = services.storageService;
  }

  // 传递配置引用
  Object.values(services).forEach(service => {
    if (service.setConfig) {
      service.setConfig(config);
    }
  });
}

/**
 * 合并配置对象
 * @param {Object} base - 基础配置
 * @param {Object} override - 覆盖配置
 * @returns {Object} 合并后的配置
 */
function mergeConfigs(base, override) {
  // 深拷贝基础配置
  const result = JSON.parse(JSON.stringify(base));

  // 递归合并覆盖配置
  mergeObjects(result, override);

  return result;
}

/**
 * 递归合并对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 */
function mergeObjects(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      mergeObjects(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

/**
 * 验证所有服务配置
 * @param {Object} services - 服务实例集合
 * @returns {Promise<boolean>} 验证结果
 */
export async function validateAllServices(services) {
  const logger = new Logger('ServiceValidator');
  const results = [];

  for (const [name, service] of Object.entries(services)) {
    try {
      const isValid = await service.validateConfig();
      results.push({ name, isValid });

      if (!isValid) {
        logger.error(`Service validation failed: ${name}`);
      }
    } catch (error) {
      logger.error(`Service validation error: ${name}`, error);
      results.push({ name: name, isValid: false, error: error.message });
    }
  }

  const allValid = results.every(r => r.isValid);

  logger.info('Service validation completed', {
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    invalid: results.filter(r => !r.isValid).length,
    allValid
  });

  return allValid;
}

/**
 * 获取服务状态
 * @param {Object} services - 服务实例集合
 * @returns {Promise<Object>} 服务状态
 */
export async function getServicesStatus(services) {
  const status = {};

  for (const [name, service] of Object.entries(services)) {
    try {
      const isValid = await service.validateConfig();
      status[name] = {
        status: isValid ? 'healthy' : 'unhealthy',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      status[name] = {
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  return status;
}
