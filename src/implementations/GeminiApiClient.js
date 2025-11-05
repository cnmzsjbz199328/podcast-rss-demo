/** 限制：每个文件不超过200行，当前行数：78行 */
/**
 * Gemini API 客户端 - 专门负责 Gemini API 调用
 */

import { Logger } from '../utils/logger.js';

export class GeminiApiClient {
  constructor(apiKey, model = 'gemini-2.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.logger = new Logger('GeminiApiClient');
    this.client = null;
  }

  /**
   * 初始化 Gemini 客户端
   */
  async initialize() {
    if (!this.client) {
      const { GoogleGenAI } = await import('@google/genai');
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
      this.logger.info('Gemini client initialized');
    }
    return this.client;
  }

  /**
   * 生成内容
   */
  async generateContent(prompt, config = {}) {
    this.logger.info('Starting Gemini API call', {
      model: this.model,
      promptLength: prompt.length,
      hasApiKey: !!this.apiKey
    });

    await this.initialize();

    const generationConfig = {
      temperature: config.temperature || 0.8,
      topK: config.topK || 40,
      topP: config.topP || 0.95,
      maxOutputTokens: config.maxTokens || 1500
    };

    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ];

    try {
      this.logger.debug('Calling Gemini API', {
        model: this.model,
        promptPreview: prompt.substring(0, 100) + '...'
      });

      const result = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings
      });

      this.logger.debug('Gemini API response received', {
        hasCandidates: !!result.candidates,
        candidateCount: result.candidates?.length || 0
      });

      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('No candidates in Gemini API response');
      }

      const candidate = result.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('No content parts in Gemini API response');
      }

      const generatedText = candidate.content.parts[0].text;

      if (!generatedText || generatedText.trim().length === 0) {
        throw new Error('Empty text content from Gemini API');
      }

      this.logger.info('Gemini API call successful', {
        textLength: generatedText.length,
        hasUsageMetadata: !!result.usageMetadata
      });

      return {
        text: generatedText,
        usageMetadata: result.usageMetadata
      };

    } catch (error) {
      this.logger.error('Gemini API call failed', {
        error: error.message,
        errorType: error.constructor.name,
        statusCode: error.statusCode,
        model: this.model,
        promptLength: prompt.length
      });

      // 记录更详细的错误信息
      if (error.response) {
        this.logger.error('Gemini API error response', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }

      throw this._handleApiError(error);
    }
  }

  /**
   * 处理API错误
   */
  _handleApiError(error) {
    if (error.message.includes('API_KEY')) {
      return new Error('Invalid Gemini API key');
    } else if (error.message.includes('quota') || error.statusCode === 429) {
      return new Error('Gemini API quota exceeded');
    } else if (error.statusCode >= 500) {
      return new Error('Gemini API server error');
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
      await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        generationConfig: { maxOutputTokens: 1 }
      });

      return true;
    } catch (error) {
      this.logger.error('Gemini configuration validation failed', error);
      return false;
    }
  }
}
