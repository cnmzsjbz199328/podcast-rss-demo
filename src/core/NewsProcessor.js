/**
 * 新闻处理逻辑
 */

import { Logger } from '../utils/logger.js';
import { validateNewsItem } from '../utils/validator.js';

export class NewsProcessor {
  /**
   * 创建新闻处理器
   * @param {Object} config - 配置对象
   */
  constructor(config) {
    this.config = config;
    this.logger = new Logger('NewsProcessor');
  }

  /**
   * 处理新闻列表
   * @param {NewsItem[]} rawNews - 原始新闻数据
   * @returns {NewsItem[]} 处理后的新闻
   */
  processNews(rawNews) {
    if (!Array.isArray(rawNews)) {
      this.logger.warn('Invalid news data: not an array');
      return [];
    }

    const validNews = rawNews
      .filter(item => this._validateAndCleanItem(item))
      .map(item => this._enrichNewsItem(item))
      .slice(0, this.config.services.rss.maxItems || 10);

    this.logger.info('News processed successfully', {
      total: rawNews.length,
      valid: validNews.length,
      filtered: rawNews.length - validNews.length
    });

    return validNews;
  }

  /**
   * 将新闻格式化为脚本输入
   * @param {NewsItem[]} news - 新闻列表
   * @returns {string} 格式化的新闻文本
   */
  formatNewsForScript(news) {
    if (!news || news.length === 0) {
      return '暂无新闻内容';
    }

    const formattedNews = news.map((item, index) => {
      return `${index + 1}. ${item.title}

${item.description}

来源: ${item.link}
时间: ${new Date(item.pubDate).toLocaleString('zh-CN')}

`;
    }).join('---\n\n');

    return `以下是今日热点新闻：

${formattedNews}

请根据以上新闻内容生成播客脚本。`;
  }

  /**
   * 验证和清理新闻项
   * @private
   * @param {NewsItem} item - 新闻项
   * @returns {boolean} 是否有效
   */
  _validateAndCleanItem(item) {
    if (!validateNewsItem(item)) {
      this.logger.debug('Invalid news item filtered out', {
        title: item?.title?.substring(0, 50)
      });
      return false;
    }

    // 清理HTML标签
    if (item.description) {
      item.description = this._stripHtml(item.description);
    }

    // 确保pubDate是有效的日期
    if (item.pubDate) {
      try {
        item.pubDate = new Date(item.pubDate).toISOString();
      } catch {
        item.pubDate = new Date().toISOString();
      }
    }

    // 生成GUID
    if (!item.guid) {
      item.guid = this._generateGuid(item);
    }

    return true;
  }

  /**
   * 丰富新闻项数据
   * @private
   * @param {NewsItem} item - 新闻项
   * @returns {NewsItem} 丰富后的新闻项
   */
  _enrichNewsItem(item) {
    return {
      ...item,
      processedAt: new Date().toISOString(),
      category: item.category || 'General',
      wordCount: this._countWords(item.description),
      summary: this._generateSummary(item.description)
    };
  }

  /**
   * 生成新闻GUID
   * @private
   * @param {NewsItem} item - 新闻项
   * @returns {string} GUID
   */
  _generateGuid(item) {
    const content = `${item.title}${item.link}${item.pubDate}`;
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    return `news-${Math.abs(hash)}`;
  }

  /**
   * 去除HTML标签
   * @private
   * @param {string} html - HTML文本
   * @returns {string} 纯文本
   */
  _stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/\s+/g, ' ')    // 规范化空白字符
      .trim();
  }

  /**
   * 计算字数
   * @private
   * @param {string} text - 文本
   * @returns {number} 字数
   */
  _countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 生成摘要
   * @private
   * @param {string} text - 文本
   * @param {number} maxLength - 最大长度
   * @returns {string} 摘要
   */
  _generateSummary(text, maxLength = 100) {
    if (!text || text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * 按分类分组新闻
   * @param {NewsItem[]} news - 新闻列表
   * @returns {Object} 按分类分组的新闻
   */
  groupNewsByCategory(news) {
    const grouped = {};

    news.forEach(item => {
      const category = item.category || 'General';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return grouped;
  }

  /**
   * 过滤重复新闻
   * @param {NewsItem[]} news - 新闻列表
   * @returns {NewsItem[]} 去重后的新闻
   */
  removeDuplicates(news) {
    const seen = new Set();
    return news.filter(item => {
      const key = item.title.toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
