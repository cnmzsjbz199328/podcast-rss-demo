/**
 * 剧集数据仓库 - 处理剧集相关的数据库操作
 */

import { Logger } from '../utils/logger.js';

export class EpisodeRepository {
  constructor(db) {
    this.db = db;
    this.logger = new Logger('EpisodeRepository');
  }

  /**
   * 保存剧集
   */
  async saveEpisode(episode) {
    this.logger.info('💾 Saving episode to database', {
      id: episode.id,
      title: episode.title,
      ttsEventId: episode.ttsEventId,
      ttsStatus: episode.ttsStatus
    });

    try {
      const result = await this.db.prepare(`
      INSERT INTO episodes (
      id, title, description, style, audio_url, audio_key,
      srt_url, vtt_url, json_url, duration, file_size, transcript, created_at, published_at,
      status, metadata, tts_event_id, tts_status, tts_error, tts_provider
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      episode.id,
      episode.title,
      episode.description || '',
      episode.style,
      episode.audioUrl || null,
      episode.audioKey || null,
      episode.srtUrl || null,
      episode.vttUrl || null,
      episode.jsonUrl || null,
      episode.duration || 0,
      episode.fileSize || 0,
      episode.transcript || '',
      episode.createdAt || new Date().toISOString(),
      episode.publishedAt || new Date().toISOString(),
      episode.status || 'published',
      JSON.stringify(episode.metadata || {}),
      episode.ttsEventId || null,
      episode.ttsStatus || 'completed',
      episode.ttsError || null,
        episode.ttsProvider || null
      ).run();

      this.logger.info('✅ Episode saved successfully', { id: episode.id });
      return result.success;

    } catch (error) {
      this.logger.error('❌ Failed to save episode', { id: episode.id, error: error.message });
      throw error;
    }
  }

  /**
   * 更新剧集音频信息
   */
  async updateEpisodeAudio(episodeId, audioData) {
    this.logger.info('🔄 Updating episode audio', {
      episodeId,
      audioUrl: audioData.audioUrl,
      fileSize: audioData.fileSize
    });

    try {
      const result = await this.db.prepare(`
      UPDATE episodes
      SET audio_url = ?, audio_key = ?, file_size = ?, duration = ?,
      tts_status = 'completed'
      WHERE id = ?
      `).bind(
      audioData.audioUrl,
      audioData.audioKey,
      audioData.fileSize || 0,
      audioData.duration || 0,
      episodeId
      ).run();

      if (result.success) {
        this.logger.info('✅ Episode audio updated successfully', { episodeId });
      } else {
        this.logger.warn('⚠️ Episode audio update returned false', { episodeId });
      }

      return result.success;

    } catch (error) {
      this.logger.error('❌ Failed to update episode audio', { episodeId, error: error.message });
      throw error;
    }
  }

  /**
   * 根据ID获取剧集
   */
  async getEpisodeById(episodeId) {
    this.logger.debug('Fetching episode by ID', { episodeId });

    try {
      const result = await this.db.prepare(`
        SELECT * FROM episodes WHERE id = ?
      `).bind(episodeId).first();

      if (result) {
        // 解析metadata JSON
        if (result.metadata) {
          try {
            result.metadata = JSON.parse(result.metadata);
          } catch (error) {
            this.logger.warn('Failed to parse episode metadata', { episodeId, error: error.message });
            result.metadata = {};
          }
        }

        // 字段名映射：snake_case -> camelCase
  result.srtUrl = result.srt_url;
  result.vttUrl = result.vtt_url;
  result.jsonUrl = result.json_url;
  result.audioUrl = result.audio_url;
  result.audioKey = result.audio_key;
  result.scriptUrl = result.transcript || null;
  result.scriptKey = result.scriptUrl ? result.scriptUrl.split('/').pop() : null;
        result.fileSize = result.file_size;
        result.createdAt = result.created_at;
        result.publishedAt = result.published_at;
        result.ttsEventId = result.tts_event_id;
        result.ttsStatus = result.tts_status;
        result.ttsError = result.tts_error;
        result.ttsProvider = result.tts_provider;

        

        this.logger.debug('Episode found', { episodeId, title: result.title });
        return result;
      }

      this.logger.debug('Episode not found', { episodeId });
      return null;

    } catch (error) {
      this.logger.error('Failed to get episode by ID', { episodeId, error: error.message });
      throw error;
    }
  }

  /**
   * 获取已发布的剧集
   */
  async getPublishedEpisodes(limit = 20, offset = 0) {
    this.logger.debug('Fetching published episodes', { limit, offset });

    try {
      const result = await this.db.prepare(`
        SELECT * FROM episodes
        WHERE status = 'published'
        ORDER BY published_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      const episodes = result.results || [];

      // 解析每个剧集的metadata并进行字段名映射
      episodes.forEach(episode => {
        if (episode.metadata) {
          try {
            episode.metadata = JSON.parse(episode.metadata);
          } catch (error) {
            this.logger.warn('Failed to parse episode metadata', { id: episode.id, error: error.message });
            episode.metadata = {};
          }
        }

        // 字段名映射：snake_case -> camelCase
          episode.srtUrl = episode.srt_url;
          episode.vttUrl = episode.vtt_url;
          episode.jsonUrl = episode.json_url;
          episode.audioUrl = episode.audio_url;
          episode.audioKey = episode.audio_key;
          episode.scriptUrl = episode.transcript || null;
          episode.scriptKey = episode.scriptUrl ? episode.scriptUrl.split('/').pop() : null;
        episode.fileSize = episode.file_size;
        episode.createdAt = episode.created_at;
        episode.publishedAt = episode.published_at;
        episode.ttsEventId = episode.tts_event_id;
        episode.ttsStatus = episode.tts_status;
        episode.ttsError = episode.tts_error;
      });

      this.logger.debug('Published episodes fetched', { count: episodes.length, limit, offset });
      return episodes;

    } catch (error) {
      this.logger.error('Failed to get published episodes', { limit, offset, error: error.message });
      throw error;
    }
  }

  /**
   * 根据风格获取剧集
   */
  async getEpisodesByStyle(style, limit = 20, offset = 0) {
    this.logger.debug('Fetching episodes by style', { style, limit, offset });

    try {
      const result = await this.db.prepare(`
        SELECT * FROM episodes
        WHERE style = ? AND status = 'published'
        ORDER BY published_at DESC
        LIMIT ? OFFSET ?
      `).bind(style, limit, offset).all();

      const episodes = result.results || [];

      // 解析metadata
      episodes.forEach(episode => {
        if (episode.metadata) {
          try {
            episode.metadata = JSON.parse(episode.metadata);
          } catch (error) {
            this.logger.warn('Failed to parse episode metadata', { id: episode.id, error: error.message });
            episode.metadata = {};
          }
        }

        episode.srtUrl = episode.srt_url;
        episode.vttUrl = episode.vtt_url;
        episode.jsonUrl = episode.json_url;
        episode.audioUrl = episode.audio_url;
        episode.audioKey = episode.audio_key;
        episode.scriptUrl = episode.transcript || null;
        episode.scriptKey = episode.scriptUrl ? episode.scriptUrl.split('/').pop() : null;
      });

      this.logger.debug('Episodes by style fetched', { style, count: episodes.length, limit, offset });
      return episodes;

    } catch (error) {
      this.logger.error('Failed to get episodes by style', { style, limit, offset, error: error.message });
      throw error;
    }
  }
}
