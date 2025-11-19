/**
 * BBC RSS服务实现
 */

import { IRssService } from '../services/IRssService.js';
import { Logger } from '../utils/logger.js';
import { withRetry } from '../utils/retryUtils.js';
import { validateUrl } from '../utils/validator.js';

export class BbcRssService extends IRssService {
  /**
   * 创建BBC RSS服务实例
   * @param {Object} config - 服务配置
   */
  constructor(config) {
    super();
    this.config = config;
    this.logger = new Logger('BbcRssService');
  }

  /**
   * 获取News列表
   * @param {Object} options - 获取选项
   * @returns {Promise<NewsItem[]>} News列表
   */
  async fetchNews(options = {}) {
    const finalOptions = { ...this.config, ...options };

    return withRetry(
      () => this._fetchRssFeed(finalOptions),
      {
        maxAttempts: 3,
        initialDelay: 1000,
        shouldRetry: (error) => {
          return error.message.includes('network') ||
                 error.message.includes('timeout') ||
                 error.status >= 500;
        }
      },
      this.logger
    );
  }

  /**
   * 获取RSS源数据
   * @private
   * @param {Object} options - 获取选项
   * @returns {Promise<NewsItem[]>} News列表
   */
  async _fetchRssFeed(options) {
    const { url, timeout = 30000, maxItems = 10 } = options;

    this.logger.info('Fetching RSS feed', { url, timeout });

    try {
      // 使用动态导入避免在不支持的平台上出现问题
      const { default: Parser } = await import('rss-parser');

      const parser = new Parser({
        timeout,
        headers: {
          'User-Agent': 'Podcast-RSS-Demo/1.0.0'
        }
      });

      const feed = await parser.parseURL(url);

      this.logger.debug('RSS feed parsed successfully', {
        title: feed.title,
        itemCount: feed.items?.length || 0
      });

      const newsItems = this._processFeedItems(feed.items || [], maxItems);

      return newsItems;

    } catch (error) {
      this.logger.error('Failed to fetch RSS feed', {
        url,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 处理RSS项目
   * @private
   * @param {Array} items - RSS项目数组
   * @param {number} maxItems - 最大项目数
   * @returns {NewsItem[]} 处理后的News项
   */
  _processFeedItems(items, maxItems) {
    return items
      .slice(0, maxItems)
      .map(item => this._convertToNewsItem(item))
      .filter(item => item !== null);
  }

  /**
   * 转换RSS项目为News项
   * @private
   * @param {Object} item - RSS项目
   * @returns {NewsItem|null} News项或null
   */
  _convertToNewsItem(item) {
    try {
      // BBC RSS特有的字段映射
      const newsItem = {
        title: item.title || '',
        description: this._extractDescription(item),
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        category: this._extractCategory(item),
        guid: item.guid || item.id || item.link,
        author: item.creator || item.author || 'BBC News',
        enclosure: item.enclosure,
        thumbnail: this._extractThumbnail(item)
      };

      // 验证必需字段
      if (!newsItem.title || !newsItem.link) {
        this.logger.debug('Skipping invalid RSS item', {
          title: newsItem.title?.substring(0, 50)
        });
        return null;
      }

      return newsItem;

    } catch (error) {
      this.logger.warn('Failed to convert RSS item', {
        error: error.message,
        itemTitle: item.title?.substring(0, 50)
      });
      return null;
    }
  }

  /**
   * 提取描述信息
   * @private
   * @param {Object} item - RSS项目
   * @returns {string} 描述文本
   */
  _extractDescription(item) {
    // BBC RSS可能在不同字段存储描述
    return item.contentSnippet ||
           item.content ||
           item.summary ||
           item.description ||
           '';
  }

  /**
   * 提取分类信息
   * @private
   * @param {Object} item - RSS项目
   * @returns {string} 分类
   */
  _extractCategory(item) {
    // 从categories字段提取
    if (item.categories && item.categories.length > 0) {
      return item.categories[0];
    }

    // 从链接中推断分类
    if (item.link) {
      const match = item.link.match(/\/([^\/]+)\/$/);
      if (match) {
        return match[1];
      }
    }

    return 'General';
  }

  /**
   * 提取缩略图
   * @private
   * @param {Object} item - RSS项目
   * @returns {string|null} 缩略图URL
   */
  _extractThumbnail(item) {
    // 检查媒体相关字段
    if (item.enclosure && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url;
    }

    // 检查BBC特有的媒体字段
    if (item.media && item.media.thumbnail) {
      return item.media.thumbnail.url || item.media.thumbnail;
    }

    return null;
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    try {
      if (!this.config.url) {
        throw new Error('RSS URL is required');
      }

      if (!validateUrl(this.config.url)) {
        throw new Error('Invalid RSS URL format');
      }

      // 尝试连接验证
      const response = await fetch(this.config.url, {
        method: 'HEAD',
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`RSS endpoint returned ${response.status}`);
      }

      this.logger.info('RSS service configuration validated successfully');
      return true;

    } catch (error) {
      this.logger.error('RSS service configuration validation failed', error);
      return false;
    }
  }

  /**
   * 获取RSS源信息
   * @returns {Promise<Object>} RSS源信息
   */
  async getFeedInfo() {
    try {
      const { default: Parser } = await import('rss-parser');
      const parser = new Parser();
      const feed = await parser.parseURL(this.config.url);

      return {
        title: feed.title,
        description: feed.description,
        link: feed.link,
        language: feed.language,
        lastBuildDate: feed.lastBuildDate,
        itemCount: feed.items?.length || 0
      };

    } catch (error) {
      this.logger.error('Failed to get feed info', error);
      throw error;
    }
  }
}
