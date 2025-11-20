import { Logger } from '../utils/logger.js';

/**
 * 主题播客数据访问层
 * 负责 topic_podcasts 表的所有数据操作
 */
export class TopicPodcastRepository {
  constructor(db) {
    this.db = db;
    this.logger = new Logger('TopicPodcastRepository');
  }

  /**
   * 创建新的主题播客记录
   * @param {Object} data - 播客数据
   * @param {number} data.topicId - 主题ID
   * @param {string} data.episodeId - 剧集ID
   * @param {string} [data.status='processing'] - 状态
   * @param {string} [data.ttsEventId] - TTS事件ID
   * @param {string} [data.audioUrl] - 音频URL
   * @param {number} [data.duration] - 时长
   * @returns {Promise<string>} 剧集ID
   */
  async create(data) {
    const {
      topicId,
      episodeId,
      status = 'processing',
      ttsEventId = null,
      audioUrl = null,
      duration = null
    } = data;

    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    this.logger.info('Creating new topic podcast', { topicId, episodeId, status });

    try {
      await this.db.prepare(`
        INSERT INTO topic_podcasts (
          topic_id, episode_id, status, tts_event_id, audio_url, duration, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        topicId, episodeId, status, ttsEventId, audioUrl, duration, createdAt, updatedAt
      ).run();

      this.logger.info('Topic podcast created successfully', { topicId, episodeId });
      return episodeId;

    } catch (error) {
      this.logger.error('Failed to create topic podcast', error);
      throw new Error(`Failed to create topic podcast: ${error.message}`);
    }
  }

  /**
   * 根据剧集ID查询播客
   * @param {string} episodeId - 剧集ID
   * @returns {Promise<Object|null>} 播客信息或null
   */
  async getById(episodeId) {
    this.logger.info('Fetching topic podcast by episode ID', { episodeId });

    try {
      const result = await this.db.prepare(`
        SELECT * FROM v_topic_podcasts WHERE episode_id = ?
      `).bind(episodeId).first();

      if (!result) {
        this.logger.info('Topic podcast not found', { episodeId });
        return null;
      }

      this.logger.info('Topic podcast found', { episodeId, status: result.status });
      return result;

    } catch (error) {
      this.logger.error('Failed to fetch topic podcast', error);
      throw new Error(`Failed to fetch topic podcast: ${error.message}`);
    }
  }

  /**
   * 根据主题查询播客列表
   * @param {number} topicId - 主题ID
   * @param {Object} filters - 过滤条件
   * @param {string} [filters.status] - 状态过滤
   * @param {number} [filters.limit=10] - 限制数量
   * @param {number} [filters.offset=0] - 偏移量
   * @returns {Promise<Array>} 播客列表
   */
  async getByTopic(topicId, filters = {}) {
    const { status, limit = 10, offset = 0 } = filters;

    this.logger.info('Fetching topic podcasts by topic ID', { topicId, status, limit, offset });

    try {
      let query = 'SELECT * FROM v_topic_podcasts WHERE topic_id = ?';
      const params = [topicId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await this.db.prepare(query).bind(...params).all();
      const podcasts = result.results;

      this.logger.info('Topic podcasts fetched successfully', { topicId, count: podcasts.length });
      return podcasts;

    } catch (error) {
      this.logger.error('Failed to fetch topic podcasts', error);
      throw new Error(`Failed to fetch topic podcasts: ${error.message}`);
    }
  }

  /**
   * 更新播客信息
   * @param {string} episodeId - 剧集ID
   * @param {Object} updates - 要更新的字段
   * @returns {Promise<boolean>} 是否更新成功
   */
  async update(episodeId, updates) {
    this.logger.info('Updating topic podcast', { episodeId, updates: Object.keys(updates) });

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

      params.push(episodeId);

      const result = await this.db.prepare(`
        UPDATE topic_podcasts SET ${fields.join(', ')}
        WHERE episode_id = ?
      `).bind(...params).run();

      const success = result.meta.changes > 0;
      this.logger.info('Topic podcast update result', { episodeId, success, changes: result.meta.changes });

      return success;

    } catch (error) {
      this.logger.error('Failed to update topic podcast', error);
      throw new Error(`Failed to update topic podcast: ${error.message}`);
    }
  }

  /**
   * 删除播客记录
   * @param {string} episodeId - 剧集ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async delete(episodeId) {
    this.logger.info('Deleting topic podcast', { episodeId });

    try {
      const result = await this.db.prepare(`
        DELETE FROM topic_podcasts WHERE episode_id = ?
      `).bind(episodeId).run();

      const success = result.meta.changes > 0;
      this.logger.info('Topic podcast deletion result', { episodeId, success, changes: result.meta.changes });

      return success;

    } catch (error) {
      this.logger.error('Failed to delete topic podcast', error);
      throw new Error(`Failed to delete topic podcast: ${error.message}`);
    }
  }

  /**
   * 获取主题的播客统计信息
   * @param {number} topicId - 主题ID
   * @returns {Promise<Object>} 统计信息
   */
  async getStatistics(topicId) {
    this.logger.info('Fetching topic podcast statistics', { topicId });

    try {
      const result = await this.db.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          MAX(created_at) as last_created_at,
          SUM(duration) as total_duration
        FROM topic_podcasts
        WHERE topic_id = ?
      `).bind(topicId).first();

      this.logger.info('Topic podcast statistics fetched', {
        topicId,
        total: result.total,
        completed: result.completed
      });

      return {
        total: result.total || 0,
        completed: result.completed || 0,
        processing: result.processing || 0,
        failed: result.failed || 0,
        lastCreatedAt: result.last_created_at,
        totalDuration: result.total_duration || 0
      };

    } catch (error) {
      this.logger.error('Failed to fetch topic podcast statistics', error);
      throw new Error(`Failed to fetch topic podcast statistics: ${error.message}`);
    }
  }

  /**
   * 获取所有主题的播客概览
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 主题播客概览列表
   */
  async getTopicsOverview(filters = {}) {
    const { status, limit = 50, offset = 0 } = filters;

    this.logger.info('Fetching topics overview', { status, limit, offset });

    try {
      let query = `
        SELECT
          t.id as topic_id,
          t.title as topic_title,
          t.category as topic_category,
          t.status as topic_status,
          COUNT(tp.id) as total_podcasts,
          COUNT(CASE WHEN tp.status = 'completed' THEN 1 END) as completed_podcasts,
          COUNT(CASE WHEN tp.status = 'processing' THEN 1 END) as processing_podcasts,
          MAX(tp.created_at) as last_podcast_created_at
        FROM topics t
        LEFT JOIN topic_podcasts tp ON t.id = tp.topic_id
      `;

      const params = [];

      if (status) {
        query += ' WHERE t.status = ?';
        params.push(status);
      }

      query += `
        GROUP BY t.id, t.title, t.category, t.status
        ORDER BY last_podcast_created_at DESC NULLS LAST
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const result = await this.db.prepare(query).bind(...params).all();
      const overview = result.results;

      this.logger.info('Topics overview fetched successfully', { count: overview.length });
      return overview;

    } catch (error) {
      this.logger.error('Failed to fetch topics overview', error);
      throw new Error(`Failed to fetch topics overview: ${error.message}`);
    }
  }

  /**
   * 批量更新播客状态
   * @param {Array<string>} episodeIds - 剧集ID列表
   * @param {string} status - 新状态
   * @returns {Promise<number>} 更新的记录数
   */
  async batchUpdateStatus(episodeIds, status) {
    this.logger.info('Batch updating podcast status', { episodeIds: episodeIds.length, status });

    try {
      // 构建IN子句的参数
      const placeholders = episodeIds.map(() => '?').join(',');
      const params = [...episodeIds, status, new Date().toISOString()];

      const result = await this.db.prepare(`
        UPDATE topic_podcasts
        SET status = ?, updated_at = ?
        WHERE episode_id IN (${placeholders})
      `).bind(...params).run();

      const updatedCount = result.meta.changes;
      this.logger.info('Batch status update completed', { updatedCount });

      return updatedCount;

    } catch (error) {
      this.logger.error('Failed to batch update status', error);
      throw new Error(`Failed to batch update status: ${error.message}`);
    }
  }

  /**
   * 清理失败的播客记录
   * @param {number} daysOld - 删除多少天前的失败记录
   * @returns {Promise<number>} 删除的记录数
   */
  async cleanupFailedPodcasts(daysOld = 30) {
    this.logger.info('Cleaning up failed podcasts', { daysOld });

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffISOString = cutoffDate.toISOString();

      const result = await this.db.prepare(`
        DELETE FROM topic_podcasts
        WHERE status = 'failed' AND created_at < ?
      `).bind(cutoffISOString).run();

      const deletedCount = result.meta.changes;
      this.logger.info('Failed podcasts cleanup completed', { deletedCount });

      return deletedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup failed podcasts', error);
      throw new Error(`Failed to cleanup failed podcasts: ${error.message}`);
    }
  }
}
