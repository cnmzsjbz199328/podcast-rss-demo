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
      is_active = true,
      generation_interval_hours = 24,
      category = 'general',
      keywords = ''
    } = topicData;

    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    this.logger.info('Creating new topic', { title, is_active, category });

    try {
      const result = await this.db.prepare(`
        INSERT INTO topics (
          title, description, is_active, generation_interval_hours, category, keywords, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        title,
        description,
        is_active ? 1 : 0,
        generation_interval_hours,
        category,
        keywords,
        createdAt,
        updatedAt
      ).run();      const topicId = result.meta.last_row_id;
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
        SELECT * FROM topics WHERE id = ?
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
   * @param {boolean} [filters.is_active] - 激活状态过滤
   * @param {string} [filters.category] - 分类过滤
   * @param {number} [filters.limit=20] - 限制数量
   * @param {number} [filters.offset=0] - 偏移量
   * @returns {Promise<Array>} 主题列表
   */
  async getTopics(filters = {}) {
    const { is_active, category, limit = 20, offset = 0 } = filters;

    this.logger.info('Fetching topics', { is_active, category, limit, offset });

    try {
      let query = 'SELECT * FROM topics WHERE 1=1';
      const params = [];

      if (typeof is_active === 'boolean') {
        query += ' AND is_active = ?';
        params.push(is_active ? 1 : 0);
      }

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await this.db.prepare(query).bind(...params).all();
      const topics = result.results || [];

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
          is_active: result.is_active === 1,
          generation_interval_hours: result.generation_interval_hours,
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
        WHERE is_active = 1
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
   * 获取激活的主题列表（用于定时任务）
   * @returns {Promise<Array>} 激活的主题列表
   */
  async getActiveTopics() {
    this.logger.info('Fetching active topics for cron job');

    try {
      const result = await this.db.prepare(`
        SELECT * FROM topics
        WHERE is_active = 1
        ORDER BY last_generated_at ASC, created_at ASC
      `).all();

      this.logger.info('Active topics fetched', { count: result.results.length });
      return result.results;

    } catch (error) {
      this.logger.error('Failed to fetch active topics', error);
      throw new Error(`Failed to fetch active topics: ${error.message}`);
    }
  }

  /**
   * 更新主题的最后生成时间
   * @param {number} topicId - 主题ID
   * @param {string} lastGeneratedAt - 最后生成时间
   * @returns {Promise<boolean>} 是否更新成功
   */
  async updateLastGenerated(topicId, lastGeneratedAt) {
    this.logger.info('Updating last generated time', { topicId, lastGeneratedAt });

    try {
      const result = await this.db.prepare(`
        UPDATE topics
        SET last_generated_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(lastGeneratedAt, new Date().toISOString(), topicId).run();

      const success = result.meta.changes > 0;
      this.logger.info('Last generated time updated', { topicId, success });

      return success;

    } catch (error) {
      this.logger.error('Failed to update last generated time', error);
      throw new Error(`Failed to update last generated time: ${error.message}`);
    }
  }

  /**
    * 搜索主题
    * @param {string} searchTerm - 搜索关键词
    * @param {Object} filters - 其他过滤条件
    * @returns {Promise<Array>} 匹配的主题列表
    */
  async searchTopics(searchTerm, filters = {}) {
    const { is_active, category, limit = 20, offset = 0 } = filters;

    this.logger.info('Searching topics', { searchTerm, is_active, category, limit, offset });

    try {
      let query = `
        SELECT * FROM topics
        WHERE (title LIKE ? OR description LIKE ? OR keywords LIKE ?)
      `;
      const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

      if (typeof is_active === 'boolean') {
        query += ' AND is_active = ?';
        params.push(is_active ? 1 : 0);
      }

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await this.db.prepare(query).bind(...params).all();
      const topics = result.results || [];

      this.logger.info('Topics search completed', { searchTerm, count: topics.length });
      return topics;

    } catch (error) {
      this.logger.error('Failed to search topics', error);
      throw new Error(`Failed to search topics: ${error.message}`);
    }
  }

  /**
   * 检查主题是否应该生成新播客（基于时间间隔）
   */
  async shouldGenerate(topicId) {
    this.logger.debug('Checking if topic should generate', { topicId });

    try {
      const topic = await this.getTopic(topicId);
      if (!topic) {
        return false;
      }

      if (!topic.last_generated_at) {
        // 第一次生成
        return true;
      }

      const intervalHours = topic.generation_interval_hours || 24;
      const lastGenerated = new Date(topic.last_generated_at);
      const now = new Date();
      const hoursSinceLastGen = (now - lastGenerated) / (1000 * 60 * 60);

      const shouldGen = hoursSinceLastGen >= intervalHours;
      this.logger.debug('Generation check result', {
        topicId,
        hoursSinceLastGen: hoursSinceLastGen.toFixed(2),
        intervalHours,
        shouldGenerate: shouldGen
      });

      return shouldGen;
    } catch (error) {
      this.logger.error('Failed to check generation status', { topicId, error: error.message });
      return false;
    }
  }

}
