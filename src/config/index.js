/**
 * 配置管理
 */

import { validateApiKey, validateUrl, validateStyleConfig } from '../utils/validator.js';
import { Logger } from '../utils/logger.js';

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  // 应用配置
  app: {
    name: 'Podcast RSS Demo',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // 服务配置
  services: {
    rss: {
      url: 'https://feeds.bbci.co.uk/news/rss.xml',
      timeout: 30000,
      maxItems: 10
    },
    script: {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.5-flash',
      maxTokens: 1500,
      temperature: 0.8
    },
    voice: {
      provider: 'indextts',
      endpoint: 'Tom1986/indextts2',
      maxRetries: 3,
      timeout: 120000
    },
    storage: {
      provider: 'r2',
      bucket: process.env.R2_BUCKET_NAME || 'podcast-files',
      region: process.env.R2_REGION || 'auto',
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      baseUrl: process.env.R2_BASE_URL,
      maxFileSize: 50 * 1024 * 1024 // 50MB
    }
  },

  // 风格配置
  styles: {
    'guo-de-gang': {
      name: '郭德纲相声风格',
      scriptPrompt: `请用郭德纲的相声风格，将以下新闻生动有趣地讲述出来。
要求：
1. 使用相声的语言特色，包括包袱、抖机灵
2. 加入适当的点评和调侃
3. 保持轻松幽默的基调
4. 适当控制长度，适合播客收听

新闻内容：
{news}`,
      voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3',
      emotionSample: 'emotions/comedy.wav',
      params: {
        emo_weight: 0.9,
        vec1: 0.8,  // 高欢乐度
        vec7: 0.6   // 适度惊讶
      }
    },
    'news-anchor': {
      name: '专业新闻播报',
      scriptPrompt: `请以专业新闻播报员的风格，将以下新闻整理成播客脚本。
要求：
1. 使用正式、客观的语言
2. 结构清晰，有逻辑顺序
3. 适当添加过渡语和总结
4. 保持新闻的专业性和准确性

新闻内容：
{news}`,
      voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
      emotionSample: 'emotions/professional.wav',
      params: {
        emo_weight: 0.3,
        vec8: 0.9   // 高中性度
      }
    }
  },

  // 生成配置
  generation: {
    maxRetries: 3,
    timeout: 300000, // 5分钟
    concurrency: 1    // 避免API限制
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json'
  }
};

/**
 * 加载配置
 * @returns {Object} 配置对象
 */
export function loadConfig() {
  const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  const logger = new Logger('ConfigLoader');

  // 从环境变量覆盖配置
  overrideFromEnv(config);

  // 验证配置（在测试环境下放宽验证）
  const isTestMode = config.app.env === 'test' ||
                     config.services.script.apiKey === 'test-api-key';
  const isValid = isTestMode ? validateConfigRelaxed(config, logger) : validateConfig(config, logger);
  if (!isValid) {
    throw new Error('Configuration validation failed');
  }

  logger.info('Configuration loaded successfully', {
    env: config.app.env,
    styles: Object.keys(config.styles)
  });

  return config;
}

/**
 * 从环境变量覆盖配置
 * @param {Object} config - 配置对象
 */
function overrideFromEnv(config) {
  // RSS配置
  if (process.env.BBC_RSS_URL) {
    config.services.rss.url = process.env.BBC_RSS_URL;
  }

  // Gemini配置
  if (process.env.GEMINI_API_KEY) {
    config.services.script.apiKey = process.env.GEMINI_API_KEY;
  }

  // R2存储配置
  if (process.env.R2_BUCKET_NAME) {
    config.services.storage.bucket = process.env.R2_BUCKET_NAME;
  }
  if (process.env.R2_ACCESS_KEY_ID) {
    config.services.storage.accessKeyId = process.env.R2_ACCESS_KEY_ID;
  }
  if (process.env.R2_SECRET_ACCESS_KEY) {
    config.services.storage.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  }
  if (process.env.R2_BASE_URL) {
    config.services.storage.baseUrl = process.env.R2_BASE_URL;
  }
}

/**
 * 验证配置
 * @param {Object} config - 配置对象
 * @param {Logger} logger - 日志实例
 * @returns {boolean} 配置是否有效
 */
function validateConfig(config, logger) {
  let isValid = true;

  // 验证API密钥
  if (!validateApiKey(config.services.script.apiKey)) {
    logger.error('Invalid Gemini API key');
    isValid = false;
  }

  // 验证RSS URL
  if (!validateUrl(config.services.rss.url)) {
    logger.error('Invalid RSS URL');
    isValid = false;
  }

  // 验证R2配置
  if (!config.services.storage.accessKeyId ||
      !config.services.storage.secretAccessKey) {
    logger.error('Missing R2 credentials');
    isValid = false;
  }

  // 验证风格配置
  for (const [key, style] of Object.entries(config.styles)) {
    if (!validateStyleConfig(style)) {
      logger.error(`Invalid style configuration: ${key}`);
      isValid = false;
    }
  }

  return isValid;
}

/**
 * 获取特定风格配置
 * @param {string} styleName - 风格名称
 * @returns {Object} 风格配置
 */
export function getStyleConfig(styleName) {
  const config = loadConfig();
  const style = config.styles[styleName];

  if (!style) {
    throw new Error(`Style not found: ${styleName}`);
  }

  return style;
}

/**
 * 获取服务配置
 * @param {string} serviceName - 服务名称
 * @returns {Object} 服务配置
 */
export function getServiceConfig(serviceName) {
  const config = loadConfig();
  const service = config.services[serviceName];

  if (!service) {
    throw new Error(`Service not found: ${serviceName}`);
  }

  return service;
}

/**
 * 宽松验证配置（用于测试环境）
 * @param {Object} config - 配置对象
 * @param {Logger} logger - 日志实例
 * @returns {boolean} 配置是否有效
 */
function validateConfigRelaxed(config, logger) {
  let isValid = true;

  // 检查必需的服务配置存在
  if (!config.services) {
    logger.error('Services configuration is missing');
    isValid = false;
  }

  // 检查风格配置
  if (!config.styles || Object.keys(config.styles).length === 0) {
    logger.warn('No styles configured, using defaults');
  }

  // 记录验证结果
  if (isValid) {
    logger.info('Configuration validation passed (relaxed mode)');
  } else {
    logger.error('Configuration validation failed (relaxed mode)');
  }

  return isValid;
}
