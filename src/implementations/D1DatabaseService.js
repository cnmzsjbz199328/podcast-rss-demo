/**
 * D1 数据库服务 - 重构后的精简版本
 */

import { Logger } from '../utils/logger.js';
import { EpisodeRepository } from '../repositories/EpisodeRepository.js';
import { StatisticsRepository } from '../repositories/StatisticsRepository.js';

export class D1DatabaseService {
  /**
   * @param {D1Database} db - Cloudflare D1 数据库绑定
   */
  constructor(db) {
    this.db = db;
    this.logger = new Logger('D1DatabaseService');

    // 初始化repositories
    this.episodes = new EpisodeRepository(db);
    this.statistics = new StatisticsRepository(db);
  }

  // Episode相关方法 - 委托给EpisodeRepository
  async saveEpisode(episode) {
    return await this.episodes.saveEpisode(episode);
  }

  async updateEpisodeAudio(episodeId, audioData) {
    return await this.episodes.updateEpisodeAudio(episodeId, audioData);
  }

  async getEpisodeById(episodeId) {
    return await this.episodes.getEpisodeById(episodeId);
  }

  async getPublishedEpisodes(limit = 20, offset = 0) {
    return await this.episodes.getPublishedEpisodes(limit, offset);
  }

  async getEpisodesByStyle(style, limit = 20, offset = 0) {
    return await this.episodes.getEpisodesByStyle(style, limit, offset);
  }

  // Statistics相关方法 - 委托给StatisticsRepository
  async getStatistics() {
    return await this.statistics.getStatistics();
  }

  async getRecentStatistics(days = 7) {
    return await this.statistics.getRecentStatistics(days);
  }

  async getTtsStatistics() {
    return await this.statistics.getTtsStatistics();
  }

  /**
   * 执行原始SQL查询（用于迁移和维护）
   * @param {string} sql - SQL语句
   * @param {Array} params - 参数
   */
  async execute(sql, params = []) {
    this.logger.debug('Executing raw SQL', { sql, paramCount: params.length });

    try {
      const result = await this.db.prepare(sql).bind(...params).run();
      this.logger.debug('Raw SQL executed successfully');
      return result;
    } catch (error) {
      this.logger.error('Raw SQL execution failed', { sql, error: error.message });
      throw error;
    }
  }

  /**
   * 查询单个结果
   * @param {string} sql - SQL语句
   * @param {Array} params - 参数
   */
  async queryFirst(sql, params = []) {
    this.logger.debug('Querying first result', { sql, paramCount: params.length });

    try {
      const result = await this.db.prepare(sql).bind(...params).first();
      this.logger.debug('Query first executed successfully');
      return result;
    } catch (error) {
      this.logger.error('Query first failed', { sql, error: error.message });
      throw error;
    }
  }

  /**
   * 查询多个结果
   * @param {string} sql - SQL语句
   * @param {Array} params - 参数
   */
  async queryAll(sql, params = []) {
    this.logger.debug('Querying all results', { sql, paramCount: params.length });

    try {
      const result = await this.db.prepare(sql).bind(...params).all();
      this.logger.debug('Query all executed successfully', { count: result.results?.length || 0 });
      return result.results || [];
    } catch (error) {
      this.logger.error('Query all failed', { sql, error: error.message });
      throw error;
    }
  }
}
