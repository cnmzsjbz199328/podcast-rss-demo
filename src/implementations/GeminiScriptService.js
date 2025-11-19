/** 限制：每个文件不超过200行，当前行数：87行 */
/**
 * Gemini脚本生成服务实现 - 重构后的精简版本
 * 使用组合模式，将职责分离到专用组件中
 */

import { IScriptService } from '../services/IScriptService.js';
import { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retryUtils.js';
import { GeminiApiClient } from './GeminiApiClient.js';
import { ScriptStyleManager } from './ScriptStyleManager.js';
import { ScriptFormatter } from './ScriptFormatter.js';

export class GeminiScriptService extends IScriptService {
  /**
   * 创建Gemini脚本服务实例
   * @param {Object} config - 服务配置
   */
  constructor(config) {
    super();
    this.config = config;
    this.logger = new Logger('GeminiScriptService');

    // 初始化组件
    this.apiClient = new GeminiApiClient(
      config.apiKey,
      config.model || 'gemini-2.5-flash'
    );
    this.styleManager = new ScriptStyleManager();
    this.formatter = new ScriptFormatter();
  }

  /**
   * 生成播客脚本
   */
  async generateScript(news, style) {
    // 验证API密钥
    if (!this.config.apiKey) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY environment variable.');
    }

    return withRetry(
      () => this._generateScript(news, style),
      {
        maxAttempts: this.config.maxRetries || 3,
        initialDelay: 2000,
        shouldRetry: (error) => this._shouldRetry(error)
      },
      this.logger
    );
  }

  /**
   * 生成脚本核心逻辑
   */
  async _generateScript(news, style) {
    this.logger.info('Starting script generation process', {
      style,
      newsCount: news.length,
      hasNews: news && news.length > 0
    });

    // 验证输入参数
    if (!news || news.length === 0) {
      throw new Error('No news data provided for script generation');
    }

    if (!style) {
      throw new Error('No style specified for script generation');
    }

    // 获取风格配置
    this.logger.debug('Getting style configuration', { style });
    const styleConfig = this.styleManager.getStyleConfig(style);
    this.logger.debug('Style configuration retrieved', {
      styleName: styleConfig.name,
      hasPrompt: !!styleConfig.scriptPrompt
    });

    // 构建提示词
    this.logger.debug('Building prompt from news data');
    const prompt = this.styleManager.buildPrompt(news, styleConfig);
    this.logger.info('Prompt built successfully', {
      promptLength: prompt.length,
      style: styleConfig.name
    });

    // 调用API
    this.logger.info('Calling Gemini API for script generation', {
      style,
      newsCount: news.length,
      model: this.config.model || 'gemini-2.5-flash'
    });

    const result = await this.apiClient.generateContent(prompt, {
      temperature: this.config.temperature || 0.8,
      maxTokens: this.config.maxTokens || 1500
    });

    this.logger.debug('Gemini API call completed', {
      hasText: !!result.text,
      textLength: result.text?.length || 0
    });

    // 格式化脚本
    this.logger.debug('Formatting generated script');
    const formattedScript = this.formatter.cleanAndFormatScript(result.text);
    const stats = this.formatter.getScriptStats(formattedScript);

    this.logger.info('Script formatted', {
      originalLength: result.text.length,
      formattedLength: formattedScript.length,
      wordCount: stats.wordCount,
      lineCount: stats.lineCount
    });

    // 验证脚本质量
    this.logger.debug('Validating script quality');
    const validation = this.formatter.validateScript(formattedScript);
    if (!validation.valid) {
      this.logger.error('Script validation failed', {
        reason: validation.reason,
        stats: validation.stats || stats
      });
      throw new Error(`Script validation failed: ${validation.reason}`);
    }

    this.logger.info('Script validation passed', {
      wordCount: stats.wordCount,
      validationStats: validation.stats
    });

    const scriptResult = {
      content: formattedScript,
      style,
      wordCount: stats.wordCount,
      generatedAt: new Date().toISOString(),
      metadata: {
        model: this.config.model,
        usageMetadata: result.usageMetadata,
        styleConfig: styleConfig.name,
        stats
      }
    };

    this.logger.info('Script generated successfully', {
      style,
      wordCount: stats.wordCount,
      tokens: result.usageMetadata?.totalTokens,
      scriptPreview: formattedScript.substring(0, 100) + '...'
    });

    return scriptResult;
  }

  /**
   * 判断是否应该重试
   */
  _shouldRetry(error) {
    return error.message.includes('quota') ||
           error.message.includes('rate') ||
           error.status === 429 ||
           error.status >= 500;
  }

  /**
   * 验证服务配置
   */
  async validateConfig() {
    return await this.apiClient.validateConfig();
  }

  /**
   * 获取支持的风格列表
   */
  getSupportedStyles() {
    return this.styleManager.getSupportedStyles();
  }

  /**
   * 获取API使用统计
   */
  getUsageStats() {
    return {
      totalRequests: 0,
      totalTokens: 0,
      averageResponseTime: 0
    };
  }
}
