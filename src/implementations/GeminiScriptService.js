/**
 * Gemini脚本生成服务实现
 */

import { IScriptService } from '../services/IScriptService.js';
import { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retryUtils.js';
import { validateApiKey } from '../utils/validator.js';

export class GeminiScriptService extends IScriptService {
  /**
   * 创建Gemini脚本服务实例
   * @param {Object} config - 服务配置
   */
  constructor(config) {
    super();
    this.config = config;
    this.logger = new Logger('GeminiScriptService');
    this.client = null;
  }

  /**
   * 生成播客脚本
   * @param {NewsItem[]} news - 新闻数据
   * @param {string} style - 脚本风格
   * @returns {Promise<ScriptResult>} 生成的脚本结果
   */
  async generateScript(news, style) {
    return withRetry(
      () => this._generateWithGemini(news, style),
      {
        maxAttempts: this.config.maxRetries || 3,
        initialDelay: 2000,
        shouldRetry: (error) => {
          return error.message.includes('quota') ||
                 error.message.includes('rate') ||
                 error.status === 429 ||
                 error.status >= 500;
        }
      },
      this.logger
    );
  }

  /**
   * 使用Gemini生成脚本
   * @private
   * @param {NewsItem[]} news - 新闻数据
   * @param {string} style - 脚本风格
   * @returns {Promise<ScriptResult>} 脚本结果
   */
  async _generateWithGemini(news, style) {
    // 动态导入Google GenAI
    const { GoogleGenAI } = await import('@google/genai');

    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey: this.config.apiKey
      });
    }

    // 获取风格配置
    const styleConfig = await this._getStyleConfig(style);

    // 构建提示词
    const prompt = this._buildPrompt(news, styleConfig);

    this.logger.info('Generating script with Gemini', {
      style,
      newsCount: news.length,
      model: this.config.model || 'gemini-2.5-flash'
    });

    try {
      const result = await this.client.models.generateContent({
        model: this.config.model || 'gemini-2.0-flash-exp',
        contents: prompt,
        generationConfig: {
          temperature: this.config.temperature || 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: this.config.maxTokens || 1500,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      });

      const generatedText = result.candidates[0].content.parts[0].text;

      if (!generatedText || generatedText.trim().length === 0) {
        throw new Error('Empty response from Gemini API');
      }

      const scriptResult = {
        content: this._cleanAndFormatScript(generatedText),
        style,
        wordCount: this._countWords(generatedText),
        generatedAt: new Date().toISOString(),
        metadata: {
          model: this.config.model,
          usageMetadata: result.usageMetadata,
          styleConfig: styleConfig.name
        }
      };

      this.logger.info('Script generated successfully', {
        style,
        wordCount: scriptResult.wordCount,
        tokens: scriptResult.metadata.totalTokens
      });

      return scriptResult;

    } catch (error) {
      this.logger.error('Gemini API call failed', {
        style,
        error: error.message,
        statusCode: error.statusCode
      });

      // 根据错误类型提供更具体的错误信息
      if (error.message.includes('API_KEY')) {
        throw new Error('Invalid Gemini API key');
      } else if (error.message.includes('quota') || error.statusCode === 429) {
        throw new Error('Gemini API quota exceeded');
      } else if (error.statusCode >= 500) {
        throw new Error('Gemini API server error');
      }

      throw error;
    }
  }

  /**
   * 获取风格配置
   * @private
   * @param {string} style - 风格名称
   * @returns {Object} 风格配置
   */
  async _getStyleConfig(style) {
    // 这里应该从配置服务获取，但暂时模拟
    const styleConfigs = {
      'guo-de-gang': {
        name: '郭德纲相声风格',
        scriptPrompt: `请用郭德纲的相声风格，将以下新闻生动有趣地讲述出来。
要求：
1. 使用相声的语言特色，包括包袱、抖机灵
2. 加入适当的点评和调侃
3. 保持轻松幽默的基调
4. 适当控制长度，适合播客收听

新闻内容：
{news}`
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
{news}`
      }
    };

    const config = styleConfigs[style];
    if (!config) {
      throw new Error(`Unsupported style: ${style}`);
    }

    return config;
  }

  /**
   * 构建提示词
   * @private
   * @param {NewsItem[]} news - 新闻数据
   * @param {Object} styleConfig - 风格配置
   * @returns {string} 完整提示词
   */
  _buildPrompt(news, styleConfig) {
    // 格式化新闻内容
    const newsContent = news.map((item, index) => {
      return `${index + 1}. ${item.title}

${item.description}

来源: ${item.link}
时间: ${new Date(item.pubDate).toLocaleString('zh-CN')}

`;
    }).join('---\n\n');

    // 替换提示词中的占位符
    return styleConfig.scriptPrompt.replace('{news}', newsContent);
  }

  /**
   * 清理和格式化脚本
   * @private
   * @param {string} script - 原始脚本
   * @returns {string} 格式化后的脚本
   */
  _cleanAndFormatScript(script) {
    return script
      .trim()
      // 移除多余的空白行
      .replace(/\n{3,}/g, '\n\n')
      // 确保段落格式
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');
  }

  /**
   * 计算字数
   * @private
   * @param {string} text - 文本
   * @returns {number} 字数
   */
  _countWords(text) {
    if (!text) return 0;
    // 中英文混合计数
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text.split(/\s+/).filter(word => word.length > 0).length;
    return chineseChars + englishWords;
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    try {
      if (!this.config.apiKey) {
        throw new Error('Gemini API key is required');
      }

      if (!validateApiKey(this.config.apiKey)) {
        throw new Error('Invalid Gemini API key format');
      }

      // 尝试简单的API调用来验证密钥
      const { GoogleGenAI } = await import('@google/genai');
      const client = new GoogleGenAI({ apiKey: this.config.apiKey });

      const model = client.models.getGenerativeModel({
        model: 'gemini-2.5-flash'
      });

      // 发送一个简单的测试请求
      await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        generationConfig: { maxOutputTokens: 1 }
      });

      this.logger.info('Gemini service configuration validated successfully');
      return true;

    } catch (error) {
      this.logger.error('Gemini service configuration validation failed', error);
      return false;
    }
  }

  /**
   * 获取支持的风格列表
   * @returns {string[]} 支持的风格
   */
  getSupportedStyles() {
    return ['guo-de-gang', 'news-anchor'];
  }

  /**
   * 获取API使用统计
   * @returns {Object} 统计信息
   */
  getUsageStats() {
    // TODO: 实现API使用统计
    return {
      totalRequests: 0,
      totalTokens: 0,
      averageResponseTime: 0
    };
  }
}
