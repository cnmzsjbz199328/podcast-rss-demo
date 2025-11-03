/**
 * 统计数据仓库 - 处理统计相关的数据库操作
 */

import { Logger } from '../utils/logger.js';

export class StatisticsRepository {
  constructor(db) {
    this.db = db;
    this.logger = new Logger('StatisticsRepository');
  }

  /**
   * 获取数据库统计信息
   */
  async getStatistics() {
    this.logger.debug('Fetching database statistics');

    try {
      // 获取总剧集数
      const totalResult = await this.db.prepare(`
        SELECT COUNT(*) as total FROM episodes
      `).first();

      // 获取已发布剧集数
      const publishedResult = await this.db.prepare(`
        SELECT COUNT(*) as published FROM episodes WHERE status = 'published'
      `).first();

      // 获取总时长
      const durationResult = await this.db.prepare(`
        SELECT COALESCE(SUM(duration), 0) as totalDuration FROM episodes WHERE status = 'published'
      `).first();

      // 获取风格统计
      const styleResult = await this.db.prepare(`
        SELECT style, COUNT(*) as count
        FROM episodes
        WHERE status = 'published'
        GROUP BY style
        ORDER BY count DESC
      `).all();

      const stats = {
        totalEpisodes: totalResult?.total || 0,
        publishedEpisodes: publishedResult?.published || 0,
        totalDuration: durationResult?.totalDuration || 0,
        styles: (styleResult.results || []).reduce((acc, row) => {
          acc[row.style] = row.count;
          return acc;
        }, {})
      };

      this.logger.debug('Statistics fetched', stats);
      return stats;

    } catch (error) {
      this.logger.error('Failed to get statistics', error);
      // 返回默认统计信息
      return {
        totalEpisodes: 0,
        publishedEpisodes: 0,
        totalDuration: 0,
        styles: {}
      };
    }
  }

  /**
   * 获取最近的剧集统计
   */
  async getRecentStatistics(days = 7) {
    this.logger.debug('Fetching recent statistics', { days });

    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const result = await this.db.prepare(`
        SELECT
          COUNT(*) as recentCount,
          COALESCE(SUM(duration), 0) as recentDuration,
          AVG(file_size) as avgFileSize
        FROM episodes
        WHERE status = 'published' AND published_at >= ?
      `).bind(dateThreshold.toISOString()).first();

      const stats = {
        recentCount: result?.recentCount || 0,
        recentDuration: result?.recentDuration || 0,
        avgFileSize: result?.avgFileSize || 0
      };

      this.logger.debug('Recent statistics fetched', { days, ...stats });
      return stats;

    } catch (error) {
      this.logger.error('Failed to get recent statistics', { days, error: error.message });
      return {
        recentCount: 0,
        recentDuration: 0,
        avgFileSize: 0
      };
    }
  }

  /**
   * 获取TTS状态统计
   */
  async getTtsStatistics() {
    this.logger.debug('Fetching TTS statistics');

    try {
      const result = await this.db.prepare(`
        SELECT tts_status, COUNT(*) as count
        FROM episodes
        GROUP BY tts_status
      `).all();

      const stats = (result.results || []).reduce((acc, row) => {
        acc[row.tts_status || 'unknown'] = row.count;
        return acc;
      }, {});

      // 确保所有状态都有默认值
      stats.pending = stats.pending || 0;
      stats.processing = stats.processing || 0;
      stats.completed = stats.completed || 0;
      stats.failed = stats.failed || 0;

      this.logger.debug('TTS statistics fetched', stats);
      return stats;

    } catch (error) {
      this.logger.error('Failed to get TTS statistics', error);
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      };
    }
  }
}
