/** 限制：每个文件不超过200行，当前行数：110行 */
/**
 * 内容数据适配器
 * 负责将不同类型的业务数据转换为AI服务统一格式
 *
 * 职责：
 * - 数据格式转换（Business -> AI Format）
 * - 业务逻辑封装（Topic vs News vs Series）
 * - 统一数据接口
 */

import { Logger } from '../utils/logger.js';

export class ContentDataAdapter {
  constructor() {
    this.logger = new Logger('ContentDataAdapter');
  }

  /**
   * 适配News数据
   * @param {Array} newsData - 新闻数据数组
   * @returns {Array} AI服务统一格式
   */
  adaptNewsData(newsData) {
    this.logger.debug('Adapting news data', { count: newsData.length });

    // News数据已经是正确格式，直接返回
    return newsData;
  }

  /**
   * 适配Topic数据
   * @param {Object} topicData - 主题数据 { topic, content }
   * @returns {Array} AI服务统一格式
   */
  adaptTopicData(topicData) {
    const { topic, content } = topicData;

    this.logger.debug('Adapting topic data', {
      topicTitle: topic.title,
      hasContent: !!content
    });

    return [{
      title: topic.title,
      description: topic.description,
      keywords: topic.keywords,
      category: topic.category,
      content: content || topic.description
    }];
  }

  /**
  * 适配Series数据（Topic系列延续）
  * @param {Object} seriesData - 系列数据 { title, description, content, source }
  * @returns {Array} AI服务统一格式
  */
  adaptSeriesData(seriesData) {
  // 处理新的数据格式：{ title, description, content, source }
    const { title, description, content, source } = seriesData;

  this.logger.debug('Adapting series data', {
  title: title,
    descriptionLength: description?.length || 0,
      contentLength: content?.length || 0,
    source: source
  });

  // 对于系列生成，直接使用传入的数据
  return [{
    title: title,
      description: description,  // 使用描述（提示词）
      content: content || description
    }];
  }

  /**
   * 统一的适配入口
   * @param {string} type - 数据类型 ('news' | 'topic' | 'topic-series')
   * @param {any} data - 业务数据
   * @returns {Array} AI服务统一格式
   */
  adapt(type, data) {
    this.logger.debug('Adapting content data', { type, hasData: !!data });

    switch (type) {
      case 'news':
        return this.adaptNewsData(data);

      case 'topic':
        return this.adaptTopicData(data);

      case 'topic-series':
        return this.adaptSeriesData(data);

      default:
        this.logger.error('Unsupported content type', { type });
        throw new Error(`Unsupported content type: ${type}`);
    }
  }
}
