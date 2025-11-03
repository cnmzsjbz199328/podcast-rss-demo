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
      ttsEventId: episode.ttsEventId,
      ttsStatus: episode.ttsStatus,
      style: episode.style 
    });

    try {
      // 验证必需字段
      if (!episode.id) {
        throw new Error('Episode ID is required');
      }

      // 注意：audioUrl 和 audioKey 现在是可选的，因为异步处理时可能还没有
      // 但 ttsEventId 应该存在（如果使用异步处理）

      this.logger.info('Executing INSERT query', { id: episode.id });

      const result = await this.db.prepare(`
        INSERT INTO episodes (
          id, title, description, style, audio_url, audio_key,
          duration, file_size, transcript, created_at, published_at, status, metadata,
          tts_event_id, tts_status, tts_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        episode.id,
        episode.title,
        episode.description || '',
        episode.style,
        episode.audioUrl || null,
        episode.audioKey || null,
        episode.duration || 0,
        episode.fileSize || 0,
        episode.transcript || '',
        episode.createdAt || new Date().toISOString(),
        episode.publishedAt || null,
        episode.status || 'published',
        JSON.stringify(episode.metadata || {}),
        episode.ttsEventId || null,
        episode.ttsStatus || 'pending',
        episode.ttsError || null
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
          duration, file_size, transcript, created_at, published_at, metadata,
          tts_event_id, tts_status, tts_error
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
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        ttsEventId: row.tts_event_id,
        ttsStatus: row.tts_status,
        ttsError: row.tts_error
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
        metadata: result.metadata ? JSON.parse(result.metadata) : {},
        ttsEventId: result.tts_event_id,
        ttsStatus: result.tts_status,
        ttsError: result.tts_error
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
   * 更新剧集的音频信息（用于异步生成完成后）
   */
  async updateEpisodeAudio(id, audioData) {
    try {
      await this.db.prepare(`
        UPDATE episodes 
        SET audio_url = ?, audio_key = ?, duration = ?, file_size = ?,
            tts_status = ?, tts_error = ?
        WHERE id = ?
      `).bind(
        audioData.audioUrl,
        audioData.audioKey,
        audioData.duration || 0,
        audioData.fileSize || 0,
        audioData.ttsStatus || 'completed',
        audioData.ttsError || null,
        id
      ).run();

      this.logger.info('Episode audio updated', { 
        id, 
        audioUrl: audioData.audioUrl,
        ttsStatus: audioData.ttsStatus 
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to update episode audio', { id, error: error.message });
      return false;
    }
  }

  /**
   * 更新TTS状态
   */
  async updateTtsStatus(id, status, error = null) {
    try {
      await this.db.prepare(`
        UPDATE episodes SET tts_status = ?, tts_error = ? WHERE id = ?
      `).bind(status, error, id).run();

      this.logger.info('TTS status updated', { id, status, error });
      return true;
    } catch (error) {
      this.logger.error('Failed to update TTS status', { id, error: error.message });
      return false;
    }
  }

  /**
   * 获取所有待处理的音频任务
   */
  async getPendingAudioTasks(limit = 10) {
    try {
      const { results } = await this.db.prepare(`
        SELECT id, tts_event_id, style, created_at
        FROM episodes
        WHERE tts_status = 'pending' AND tts_event_id IS NOT NULL
        ORDER BY created_at ASC
        LIMIT ?
      `).bind(limit).all();

      return results;
    } catch (error) {
      this.logger.error('Failed to get pending audio tasks', error);
      return [];
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
