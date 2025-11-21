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
  episodeNumber,
  title = '',
  keywords = '',
  abstract = '',
  scriptUrl = null,
    audioUrl = null,
      srtUrl = null,
    vttUrl = null,
    jsonUrl = null,
    duration = 0,
      fileSize = 0,
    wordCount = 0,
      status = 'draft',
    ttsEventId = null,
  ttsStatus = 'pending'
  } = data;

  const createdAt = new Date().toISOString();

  this.logger.info('Creating new topic podcast', { topicId, episodeNumber, title, status });

    try {
      const result = await this.db.prepare(`
        INSERT INTO topic_podcasts (
          topic_id, episode_id, episode_number, title, keywords, abstract,
          script_url, audio_url, srt_url, vtt_url, json_url,
          duration, file_size, word_count,
          status, created_at, updated_at,
          tts_event_id, tts_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        topicId, episodeId, episodeNumber, title, keywords, abstract,
        scriptUrl, audioUrl, srtUrl, vttUrl, jsonUrl,
        duration, fileSize, wordCount,
        status, createdAt, createdAt,
        ttsEventId, ttsStatus
      ).run();

      const podcastId = result.meta.last_row_id;
      this.logger.info('Topic podcast created successfully', { podcastId, topicId, episodeNumber });
      return podcastId;

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
  * 获取全局统计信息（所有topic podcasts）
  * @returns {Promise<Object>} 全局统计信息
   */
  async getGlobalStatistics() {
    this.logger.info('Fetching global topic podcast statistics');

    try {
      const result = await this.db.prepare(`
        SELECT
          COUNT(*) as totalPodcasts,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedPodcasts,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processingPodcasts,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failedPodcasts,
          SUM(duration) as totalDuration,
          MAX(created_at) as lastCreatedAt
        FROM topic_podcasts
      `).first();

      this.logger.info('Global topic podcast statistics fetched', {
        totalPodcasts: result.totalPodcasts,
        completedPodcasts: result.completedPodcasts
      });

      return {
        totalPodcasts: result.totalPodcasts || 0,
        completedPodcasts: result.completedPodcasts || 0,
        processingPodcasts: result.processingPodcasts || 0,
        failedPodcasts: result.failedPodcasts || 0,
        totalDuration: result.totalDuration || 0,
        lastCreatedAt: result.lastCreatedAt
      };

    } catch (error) {
      this.logger.error('Failed to fetch global topic podcast statistics', error);
      throw new Error(`Failed to fetch global topic podcast statistics: ${error.message}`);
    }
  }

  /**
  * 获取所有topic podcasts（支持过滤和分页）
  * @param {Object} filters - 过滤条件
  * @returns {Promise<Array>} topic podcasts列表
  */
  async getAll(filters = {}) {
    const { status, limit = 50, offset = 0 } = filters;

    this.logger.info('Fetching all topic podcasts', { status, limit, offset });

    try {
      let query = `
        SELECT
          tp.id,
          tp.topic_id,
          tp.episode_id,
          tp.episode_number,
          tp.title,
          tp.keywords,
          tp.abstract,
          tp.status,
          tp.audio_url,
          tp.srt_url,
          tp.vtt_url,
          tp.json_url,
          tp.duration,
          tp.created_at,
          tp.updated_at,
          tp.tts_event_id,
          t.title as topic_title,
          t.category as topic_category
        FROM topic_podcasts tp
        JOIN topics t ON tp.topic_id = t.id
      `;

      const params = [];

      if (status) {
        query += ' WHERE tp.status = ?';
        params.push(status);
      }

      query += ' ORDER BY tp.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await this.db.prepare(query).bind(...params).all();
      const podcasts = result.results;

      this.logger.info('Topic podcasts fetched successfully', { count: podcasts.length });
      return podcasts;

    } catch (error) {
      this.logger.error('Failed to fetch topic podcasts', error);
      throw new Error(`Failed to fetch topic podcasts: ${error.message}`);
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

  /**
  * 获取主题的最大剧集编号
  * @param {number} topicId - 主题ID
    * @returns {Promise<number>} 最大剧集编号
  */
  async getMaxEpisodeNumber(topicId) {
  this.logger.debug('Getting max episode number for topic', { topicId });

  try {
  const result = await this.db.prepare(`
  SELECT COALESCE(MAX(episode_number), 0) AS max_episode_number
    FROM topic_podcasts
        WHERE topic_id = ?
  `).bind(topicId).first();

  const maxEpisodeNumber = result.max_episode_number || 0;
    this.logger.debug('Max episode number retrieved', { topicId, maxEpisodeNumber });
  return maxEpisodeNumber;
  } catch (error) {
    this.logger.error('Failed to get max episode number', { topicId, error: error.message });
      throw error;
    }
  }

  /**
    * 获取主题的下一集编号（用于系列生成）
    */
  async getNextEpisodeNumber(topicId) {
    const maxEpisodeNumber = await this.getMaxEpisodeNumber(topicId);
    return maxEpisodeNumber + 1;
  }

  /**
   * 获取主题的最近N集播客（用于AI生成历史）
   */
  async getRecentEpisodes(topicId, limit = 10) {
    this.logger.debug('Getting recent episodes for topic', { topicId, limit });

    try {
      const result = await this.db.prepare(`
        SELECT * FROM topic_podcasts
        WHERE topic_id = ? AND status IN ('completed', 'published')
        ORDER BY episode_number DESC
        LIMIT ?
      `).bind(topicId, limit).all();

      const episodes = result.results || result;
      this.logger.debug('Recent episodes fetched', { topicId, count: episodes.length });
      return episodes.reverse();  // 反转为正序
    } catch (error) {
      this.logger.error('Failed to get recent episodes', { topicId, error: error.message });
      throw error;
    }
  }

  /**
   * 更新播客状态和内容链接
   */
  async updatePodcastWithContent(podcastId, updates) {
    this.logger.info('Updating podcast with content', { podcastId, updates: Object.keys(updates) });

    try {
      const fields = [];
      const params = [];

      // 构建更新字段
      if (updates.title !== undefined) {
        fields.push('title = ?');
        params.push(updates.title);
      }
      if (updates.keywords !== undefined) {
        fields.push('keywords = ?');
        params.push(updates.keywords);
      }
      if (updates.abstract !== undefined) {
        fields.push('abstract = ?');
        params.push(updates.abstract);
      }
      if (updates.scriptUrl !== undefined) {
        fields.push('script_url = ?');
        params.push(updates.scriptUrl);
      }
      if (updates.audioUrl !== undefined) {
        fields.push('audio_url = ?');
        params.push(updates.audioUrl);
      }
      if (updates.srtUrl !== undefined) {
        fields.push('srt_url = ?');
        params.push(updates.srtUrl);
      }
      if (updates.vttUrl !== undefined) {
        fields.push('vtt_url = ?');
        params.push(updates.vttUrl);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        params.push(updates.status);
        if (updates.status === 'published') {
          fields.push('published_at = ?');
          params.push(new Date().toISOString());
        }
      }
      if (updates.ttsStatus !== undefined) {
        fields.push('tts_status = ?');
        params.push(updates.ttsStatus);
      }
      if (updates.duration !== undefined) {
        fields.push('duration = ?');
        params.push(updates.duration);
      }
      if (updates.fileSize !== undefined) {
        fields.push('file_size = ?');
        params.push(updates.fileSize);
      }
      if (updates.wordCount !== undefined) {
        fields.push('word_count = ?');
        params.push(updates.wordCount);
      }

      if (fields.length === 0) {
        this.logger.warn('No fields to update', { podcastId });
        return false;
      }

      params.push(podcastId); // WHERE 条件

      const sql = `UPDATE topic_podcasts SET ${fields.join(', ')} WHERE id = ?`;
      const result = await this.db.prepare(sql).bind(...params).run();

      const success = result.success;
      this.logger.info('Podcast update result', { podcastId, success, changes: result.meta.changes });

      return success;
    } catch (error) {
      this.logger.error('Failed to update podcast with content', { podcastId, error: error.message });
      throw new Error(`Failed to update podcast: ${error.message}`);
    }
  }
}
