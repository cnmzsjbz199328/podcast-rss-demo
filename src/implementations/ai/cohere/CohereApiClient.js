/** 限制：每个文件不超过200行，当前行数：78行 */
/**
 * Cohere API 客户端 - 专门负责 Cohere API 调用
 */

import { Logger } from '../../../utils/logger.js';

export class CohereApiClient {
  constructor(apiKey, model = 'command-a-03-2025') {
    this.apiKey = apiKey;
    this.model = model;
    this.logger = new Logger('CohereApiClient');
    this.client = null;
  }

  /**
   * 初始化 Cohere 客户端
   */
  async initialize() {
    if (!this.client) {
      const { CohereClientV2 } = await import('cohere-ai');
      this.client = new CohereClientV2({ token: this.apiKey });
      this.logger.info('Cohere client initialized');
    }
    return this.client;
  }

  /**
   * 生成内容
   */
  async generateContent(prompt, config = {}) {
    this.logger.info('Starting Cohere API call', {
      model: this.model,
      promptLength: prompt.length,
      hasApiKey: !!this.apiKey
    });

    await this.initialize();

    try {
      this.logger.debug('Calling Cohere API', {
        model: this.model,
        promptPreview: prompt.substring(0, 100) + '...'
      });

      const response = await this.client.chat({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature || 0.8,
        maxTokens: config.maxTokens || 1500
      });

      this.logger.debug('Cohere API response received', {
        hasMessage: !!response.message,
        hasContent: !!response.message?.content
      });

      if (!response.message || !response.message.content) {
        throw new Error('No content in Cohere API response');
      }

      const generatedText = response.message.content[0]?.text || '';

      if (!generatedText || generatedText.trim().length === 0) {
        throw new Error('Empty text content from Cohere API');
      }

      this.logger.info('Cohere API call successful', {
        textLength: generatedText.length,
        hasUsage: !!response.usage
      });

      return {
        text: generatedText,
        usageMetadata: response.usage ? {
          totalTokens: response.usage.billedUnits?.inputTokens + response.usage.billedUnits?.outputTokens || 0,
          inputTokens: response.usage.billedUnits?.inputTokens || 0,
          outputTokens: response.usage.billedUnits?.outputTokens || 0
        } : null
      };

    } catch (error) {
      this.logger.error('Cohere API call failed', {
        error: error.message,
        errorType: error.constructor.name,
        model: this.model,
        promptLength: prompt.length
      });

      throw this._handleApiError(error);
    }
  }

  /**
   * 处理API错误
   */
  _handleApiError(error) {
    if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
      return new Error('Invalid Cohere API key');
    } else if (error.message.includes('quota') || error.message.includes('rate')) {
      return new Error('Cohere API quota exceeded');
    } else if (error.status >= 500) {
      return new Error('Cohere API server error');
    }
    return error;
  }

  /**
   * 验证配置
   */
  async validateConfig() {
    try {
      await this.initialize();

      // 发送一个简单的测试请求
      await this.client.chat({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        maxTokens: 1
      });

      return true;
    } catch (error) {
      this.logger.error('Cohere configuration validation failed', error);
      return false;
    }
  }
}
