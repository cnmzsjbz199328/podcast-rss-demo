import { Logger } from '../utils/logger.js';

/**
 * 主题数据访问层
 * 负责 topics 表的所有数据操作
 */
export class TopicRepository {
  constructor(db) {
    this.db = db;
    this.logger = new Logger('TopicRepository');
  }

  /**
   * 创建新主题
   * @param {Object} topicData - 主题数据
   * @param {string} topicData.title - 主题标题
   * @param {string} [topicData.description] - 主题描述
   * @param {string} [topicData.keywords] - 关键词
   * @param {string} [topicData.category='general'] - 分类
   * @param {string} [topicData.status='active'] - 状态
   * @returns {Promise<number>} 新创建的主题ID
   */
  async create(topicData) {
    const {
      title,
      description = '',
      keywords = '',
      category = 'general',
      status = 'active'
    } = topicData;

    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    this.logger.info('Creating new topic', { title, category });

    try {
      const result = await this.db.prepare(`
        INSERT INTO topics (title, description, keywords, category, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(title, description, keywords, category, status, createdAt, updatedAt).run();

      const topicId = result.meta.last_row_id;
      this.logger.info('Topic created successfully', { topicId, title });

      return topicId;

    } catch (error) {
      this.logger.error('Failed to create topic', error);
      throw new Error(`Failed to create topic: ${error.message}`);
    }
  }

  /**
   * 根据ID查询主题
   * @param {number} topicId - 主题ID
   * @returns {Promise<Object|null>} 主题信息或null
   */
  async getTopic(topicId) {
    this.logger.info('Fetching topic by ID', { topicId });

    try {
      const result = await this.db.prepare(`
        SELECT * FROM v_topics WHERE id = ?
      `).bind(topicId).first();

      if (!result) {
        this.logger.info('Topic not found', { topicId });
        return null;
      }

      this.logger.info('Topic found', { topicId, title: result.title });
      return result;

    } catch (error) {
      this.logger.error('Failed to fetch topic', error);
      throw new Error(`Failed to fetch topic: ${error.message}`);
    }
  }

  /**
   * 查询主题列表
   * @param {Object} filters - 过滤条件
   * @param {string} [filters.status] - 状态过滤
   * @param {string} [filters.category] - 分类过滤
   * @param {number} [filters.limit=20] - 限制数量
   * @param {number} [filters.offset=0] - 偏移量
   * @returns {Promise<Array>} 主题列表
   */
  async getTopics(filters = {}) {
    const { status, category, limit = 20, offset = 0 } = filters;

    this.logger.info('Fetching topics', { status, category, limit, offset });

    try {
      let query = 'SELECT * FROM v_topics WHERE 1=1';
      const params = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await this.db.prepare(query).bind(...params).all();
      const topics = result.results;

      this.logger.info('Topics fetched successfully', { count: topics.length });
      return topics;

    } catch (error) {
      this.logger.error('Failed to fetch topics', error);
      throw new Error(`Failed to fetch topics: ${error.message}`);
    }
  }

  /**
   * 更新主题信息
   * @param {number} topicId - 主题ID
   * @param {Object} updates - 要更新的字段
   * @returns {Promise<boolean>} 是否更新成功
   */
  async update(topicId, updates) {
    this.logger.info('Updating topic', { topicId, updates: Object.keys(updates) });

    try {
      const fields = [];
      const params = [];

      // 动态构建更新语句
      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        params.push(value);
      }

      // 总是更新 updated_at
      fields.push('updated_at = ?');
      params.push(new Date().toISOString());

      params.push(topicId);

      const result = await this.db.prepare(`
        UPDATE topics SET ${fields.join(', ')}
        WHERE id = ?
      `).bind(...params).run();

      const success = result.meta.changes > 0;
      this.logger.info('Topic update result', { topicId, success, changes: result.meta.changes });

      return success;

    } catch (error) {
      this.logger.error('Failed to update topic', error);
      throw new Error(`Failed to update topic: ${error.message}`);
    }
  }

  /**
   * 删除主题
   * @param {number} topicId - 主题ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async delete(topicId) {
    this.logger.info('Deleting topic', { topicId });

    try {
      const result = await this.db.prepare(`
        DELETE FROM topics WHERE id = ?
      `).bind(topicId).run();

      const success = result.meta.changes > 0;
      this.logger.info('Topic deletion result', { topicId, success, changes: result.meta.changes });

      return success;

    } catch (error) {
      this.logger.error('Failed to delete topic', error);
      throw new Error(`Failed to delete topic: ${error.message}`);
    }
  }

  /**
   * 获取主题统计信息
   * @param {number} topicId - 主题ID
   * @returns {Promise<Object>} 统计信息
   */
  async getStatistics(topicId) {
    this.logger.info('Fetching topic statistics', { topicId });

    try {
      const result = await this.db.prepare(`
        SELECT
          t.*,
          COUNT(tp.id) as total_podcasts,
          COUNT(CASE WHEN tp.status = 'completed' THEN 1 END) as completed_podcasts,
          COUNT(CASE WHEN tp.status = 'processing' THEN 1 END) as processing_podcasts,
          MAX(tp.created_at) as last_podcast_created_at
        FROM topics t
        LEFT JOIN topic_podcasts tp ON t.id = tp.topic_id
        WHERE t.id = ?
        GROUP BY t.id
      `).bind(topicId).first();

      if (!result) {
        throw new Error(`Topic not found: ${topicId}`);
      }

      this.logger.info('Topic statistics fetched', {
        topicId,
        totalPodcasts: result.total_podcasts,
        completedPodcasts: result.completed_podcasts
      });

      return {
        topic: {
          id: result.id,
          title: result.title,
          description: result.description,
          keywords: result.keywords,
          category: result.category,
          status: result.status,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        statistics: {
          totalPodcasts: result.total_podcasts,
          completedPodcasts: result.completed_podcasts,
          processingPodcasts: result.processing_podcasts,
          lastPodcastCreatedAt: result.last_podcast_created_at
        }
      };

    } catch (error) {
      this.logger.error('Failed to fetch topic statistics', error);
      throw new Error(`Failed to fetch topic statistics: ${error.message}`);
    }
  }

  /**
  * 获取下一个待处理的主题
  * @returns {Promise<number|null>} 主题ID或null
  */
  async getNextPendingTopic() {
  this.logger.info('Getting next pending topic');

    try {
      // 查询活跃状态的主题，按创建时间排序，取第一个
      const result = await this.db.prepare(`
        SELECT id FROM topics
        WHERE status = 'active'
        ORDER BY created_at ASC
        LIMIT 1
      `).first();

      if (result) {
        this.logger.info('Next pending topic found', { topicId: result.id });
        return result.id;
      } else {
        this.logger.info('No pending topics found');
        return null;
      }

    } catch (error) {
      this.logger.error('Failed to get next pending topic', error);
      throw new Error(`Failed to get next pending topic: ${error.message}`);
    }
  }

  /**
    * 搜索主题
    * @param {string} searchTerm - 搜索关键词
    * @param {Object} filters - 其他过滤条件
    * @returns {Promise<Array>} 匹配的主题列表
    */
  async searchTopics(searchTerm, filters = {}) {
    const { status, category, limit = 20, offset = 0 } = filters;

    this.logger.info('Searching topics', { searchTerm, status, category, limit, offset });

    try {
      let query = `
        SELECT * FROM v_topics
        WHERE (title LIKE ? OR description LIKE ? OR keywords LIKE ?)
      `;
      const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await this.db.prepare(query).bind(...params).all();
      const topics = result.results;

      this.logger.info('Topics search completed', { searchTerm, count: topics.length });
      return topics;

    } catch (error) {
      this.logger.error('Failed to search topics', error);
      throw new Error(`Failed to search topics: ${error.message}`);
    }
  }
}
