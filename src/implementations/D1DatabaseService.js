/**
 * D1 数据库服务 - 播客元数据存储
 */

import { Logger } from '../utils/logger.js';

export class D1DatabaseService {
  /**
   * @param {D1Database} db - Cloudflare D1 数据库绑定
   */
  constructor(db) {
    this.db = db;
    this.logger = new Logger('D1DatabaseService');
  }

  /**
   * 保存播客剧集
   */
  async saveEpisode(episode) {
    this.logger.info('💾 Starting to save episode', { 
      id: episode.id, 
      title: episode.title,
      audioUrl: episode.audioUrl,
      style: episode.style 
    });

    try {
      // 验证必需字段
      if (!episode.id) {
        throw new Error('Episode ID is required');
      }
      if (!episode.audioUrl) {
        throw new Error('Audio URL is required');
      }
      if (!episode.audioKey) {
        throw new Error('Audio Key is required');
      }

      this.logger.info('Executing INSERT query', { id: episode.id });

      const result = await this.db.prepare(`
        INSERT INTO episodes (
          id, title, description, style, audio_url, audio_key,
          duration, file_size, transcript, created_at, published_at, status, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        episode.id,
        episode.title,
        episode.description || '',
        episode.style,
        episode.audioUrl,
        episode.audioKey,
        episode.duration || 0,
        episode.fileSize || 0,
        episode.transcript || '',
        episode.createdAt || new Date().toISOString(),
        episode.publishedAt || null,
        episode.status || 'published',
        JSON.stringify(episode.metadata || {})
      ).run();

      this.logger.info('✅ INSERT query completed', { 
        id: episode.id, 
        success: result.success,
        meta: result.meta 
      });

      // 验证是否真的保存成功
      const saved = await this.getEpisodeById(episode.id);
      if (saved) {
        this.logger.info('✅ Episode verified in database', { id: episode.id });
      } else {
        this.logger.error('❌ Episode not found after save', { id: episode.id });
      }

      return result.success;
    } catch (error) {
      this.logger.error('❌ Failed to save episode', { 
        id: episode.id,
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * 获取所有已发布的播客剧集
   */
  async getPublishedEpisodes(limit = 100, offset = 0) {
    try {
      const { results } = await this.db.prepare(`
        SELECT 
          id, title, description, style, audio_url, audio_key,
          duration, file_size, transcript, created_at, published_at, metadata
        FROM episodes
        WHERE status = 'published'
        ORDER BY published_at DESC, created_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      return results.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        style: row.style,
        audioUrl: row.audio_url,
        audioKey: row.audio_key,
        duration: row.duration,
        fileSize: row.file_size,
        transcript: row.transcript,
        createdAt: row.created_at,
        publishedAt: row.published_at,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));
    } catch (error) {
      this.logger.error('Failed to get published episodes', error);
      return [];
    }
  }

  /**
   * 根据 ID 获取单个剧集
   */
  async getEpisodeById(id) {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM episodes WHERE id = ?
      `).bind(id).first();

      if (!result) return null;

      return {
        id: result.id,
        title: result.title,
        description: result.description,
        style: result.style,
        audioUrl: result.audio_url,
        audioKey: result.audio_key,
        duration: result.duration,
        fileSize: result.file_size,
        transcript: result.transcript,
        createdAt: result.created_at,
        publishedAt: result.published_at,
        status: result.status,
        metadata: result.metadata ? JSON.parse(result.metadata) : {}
      };
    } catch (error) {
      this.logger.error('Failed to get episode', { id, error: error.message });
      return null;
    }
  }

  /**
   * 根据风格获取剧集
   */
  async getEpisodesByStyle(style, limit = 20) {
    try {
      const { results } = await this.db.prepare(`
        SELECT * FROM episodes
        WHERE style = ? AND status = 'published'
        ORDER BY published_at DESC, created_at DESC
        LIMIT ?
      `).bind(style, limit).all();

      return results.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        audioUrl: row.audio_url,
        duration: row.duration,
        createdAt: row.created_at,
        publishedAt: row.published_at
      }));
    } catch (error) {
      this.logger.error('Failed to get episodes by style', { style, error: error.message });
      return [];
    }
  }

  /**
   * 删除剧集
   */
  async deleteEpisode(id) {
    try {
      await this.db.prepare(`
        DELETE FROM episodes WHERE id = ?
      `).bind(id).run();

      this.logger.info('Episode deleted', { id });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete episode', { id, error: error.message });
      return false;
    }
  }

  /**
   * 更新剧集状态
   */
  async updateEpisodeStatus(id, status) {
    try {
      await this.db.prepare(`
        UPDATE episodes SET status = ? WHERE id = ?
      `).bind(status, id).run();

      this.logger.info('Episode status updated', { id, status });
      return true;
    } catch (error) {
      this.logger.error('Failed to update episode status', { id, error: error.message });
      return false;
    }
  }

  /**
   * 记录生成任务
   */
  async createGenerationTask(task) {
    try {
      const result = await this.db.prepare(`
        INSERT INTO generation_tasks (
          id, style, status, started_at, metadata
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        task.id,
        task.style,
        task.status || 'pending',
        task.startedAt || new Date().toISOString(),
        JSON.stringify(task.metadata || {})
      ).run();

      return result.success;
    } catch (error) {
      this.logger.error('Failed to create generation task', error);
      throw error;
    }
  }

  /**
   * 更新生成任务
   */
  async updateGenerationTask(id, updates) {
    try {
      const fields = [];
      const values = [];

      if (updates.status) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.completedAt) {
        fields.push('completed_at = ?');
        values.push(updates.completedAt);
      }
      if (updates.errorMessage) {
        fields.push('error_message = ?');
        values.push(updates.errorMessage);
      }
      if (updates.episodeId) {
        fields.push('episode_id = ?');
        values.push(updates.episodeId);
      }

      values.push(id);

      await this.db.prepare(`
        UPDATE generation_tasks SET ${fields.join(', ')} WHERE id = ?
      `).bind(...values).run();

      return true;
    } catch (error) {
      this.logger.error('Failed to update generation task', { id, error: error.message });
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics() {
    try {
      const totalEpisodes = await this.db.prepare(`
        SELECT COUNT(*) as count FROM episodes
      `).first();

      const publishedEpisodes = await this.db.prepare(`
        SELECT COUNT(*) as count FROM episodes WHERE status = 'published'
      `).first();

      const styleStats = await this.db.prepare(`
        SELECT style, COUNT(*) as count FROM episodes 
        WHERE status = 'published'
        GROUP BY style
      `).all();

      return {
        totalEpisodes: totalEpisodes.count,
        publishedEpisodes: publishedEpisodes.count,
        byStyle: styleStats.results.reduce((acc, row) => {
          acc[row.style] = row.count;
          return acc;
        }, {})
      };
    } catch (error) {
      this.logger.error('Failed to get statistics', error);
      return {
        totalEpisodes: 0,
        publishedEpisodes: 0,
        byStyle: {}
      };
    }
  }
}
