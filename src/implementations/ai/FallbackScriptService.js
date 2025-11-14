/** 限制：每个文件不超过200行，当前行数：85行 */
/**
 * 脚本服务回退实现 - 默认使用Gemini，失败时使用Cohere
 * 实现故障转移机制，确保脚本生成的可靠性
 */

import { IScriptService } from '../../services/IScriptService.js';
import { Logger } from '../../utils/logger.js';
import { GeminiScriptService } from './gemini/GeminiScriptService.js';
import { CohereScriptService } from './cohere/CohereScriptService.js';

export class FallbackScriptService extends IScriptService {
  /**
   * 创建回退脚本服务实例
   * @param {Object} geminiConfig - Gemini配置
   * @param {Object} cohereConfig - Cohere配置
   */
  constructor(geminiConfig, cohereConfig) {
    super();
    this.geminiConfig = geminiConfig;
    this.cohereConfig = cohereConfig;
    this.logger = new Logger('FallbackScriptService');

    // 初始化服务实例
    this.primaryService = null;
    this.fallbackService = null;
  }

  /**
   * 延迟初始化服务
   */
  _initializeServices() {
    if (!this.primaryService) {
      this.primaryService = new GeminiScriptService(this.geminiConfig);
      this.logger.info('Primary Gemini service initialized');
    }

    if (!this.fallbackService && this.cohereConfig?.apiKey) {
      this.fallbackService = new CohereScriptService(this.cohereConfig);
      this.logger.info('Fallback Cohere service initialized');
    }
  }

  /**
   * 生成播客脚本 - 优先使用Gemini，失败时使用Cohere
   */
  async generateScript(news, style) {
    this._initializeServices();

    // 尝试使用主服务 (Gemini)
    try {
      this.logger.info('Attempting script generation with primary service (Gemini)', {
        style,
        newsCount: news?.length || 0
      });

      const result = await this.primaryService.generateScript(news, style);
      this.logger.info('Primary service succeeded', {
        style,
        wordCount: result.wordCount
      });

      return result;

    } catch (error) {
      this.logger.warn('Primary service failed, attempting fallback', {
        error: error.message,
        style,
        hasFallbackService: !!this.fallbackService
      });

      // 如果主服务失败，尝试回退服务
      if (this.fallbackService) {
        try {
          this.logger.info('Attempting script generation with fallback service (Cohere)', {
            style,
            newsCount: news?.length || 0
          });

          const fallbackResult = await this.fallbackService.generateScript(news, style);
          this.logger.info('Fallback service succeeded', {
            style,
            wordCount: fallbackResult.wordCount
          });

          return fallbackResult;

        } catch (fallbackError) {
          this.logger.error('Both primary and fallback services failed', {
            primaryError: error.message,
            fallbackError: fallbackError.message,
            style
          });

          throw new Error(`Script generation failed: Primary service error: ${error.message}, Fallback service error: ${fallbackError.message}`);
        }
      } else {
        this.logger.error('No fallback service available, primary service failed', {
          error: error.message,
          style
        });

        throw error;
      }
    }
  }

  /**
   * 验证服务配置 - 检查任一服务是否可用
   */
  async validateConfig() {
    this._initializeServices();

    const results = [];

    // 检查主服务
    if (this.primaryService) {
      try {
        const primaryValid = await this.primaryService.validateConfig();
        results.push({ service: 'Gemini', valid: primaryValid });
      } catch (error) {
        results.push({ service: 'Gemini', valid: false, error: error.message });
      }
    }

    // 检查回退服务
    if (this.fallbackService) {
      try {
        const fallbackValid = await this.fallbackService.validateConfig();
        results.push({ service: 'Cohere', valid: fallbackValid });
      } catch (error) {
        results.push({ service: 'Cohere', valid: false, error: error.message });
      }
    }

    const anyValid = results.some(r => r.valid);

    this.logger.info('Configuration validation completed', {
      results,
      anyValid
    });

    return anyValid;
  }

  /**
   * 获取支持的风格列表 - 从主服务获取
   */
  getSupportedStyles() {
    this._initializeServices();
    return this.primaryService ? this.primaryService.getSupportedStyles() : [];
  }

  /**
   * 获取API使用统计 - 合并两个服务的统计
   */
  getUsageStats() {
    this._initializeServices();

    const primaryStats = this.primaryService ? this.primaryService.getUsageStats() : {};
    const fallbackStats = this.fallbackService ? this.fallbackService.getUsageStats() : {};

    return {
      primary: primaryStats,
      fallback: fallbackStats,
      totalRequests: (primaryStats.totalRequests || 0) + (fallbackStats.totalRequests || 0),
      totalTokens: (primaryStats.totalTokens || 0) + (fallbackStats.totalTokens || 0)
    };
  }
}
