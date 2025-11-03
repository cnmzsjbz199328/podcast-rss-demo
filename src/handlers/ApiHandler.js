/**
 * API处理器 - 重构后的精简版本，使用专用处理器
 */

import { Logger } from '../utils/logger.js';
import { EpisodeApiHandler } from './EpisodeApiHandler.js';
import { FeedApiHandler } from './FeedApiHandler.js';
import { SystemApiHandler } from './SystemApiHandler.js';

export class ApiHandler {
  constructor() {
    this.logger = new Logger('ApiHandler');

    // 初始化专用处理器
    this.episodes = new EpisodeApiHandler();
    this.feeds = new FeedApiHandler();
    this.system = new SystemApiHandler();
  }

  /**
   * 处理剧集列表请求
   */
  async handleEpisodes(request, services) {
    return await this.episodes.handleEpisodes(request, services);
  }

  /**
   * 处理单个剧集详情请求
   */
  async handleEpisodeDetail(request, services, params) {
    return await this.episodes.handleEpisodeDetail(request, services, params);
  }

  /**
   * 处理RSS Feed请求
   */
  async handleRssFeed(request, services) {
    return await this.feeds.handleRssFeed(request, services);
  }

  /**
   * 处理健康检查请求
   */
  async handleHealth(request, services) {
    return await this.system.handleHealth(request, services);
  }

  /**
   * 处理系统统计信息
   */
  async handleSystemStats(request, services) {
    return await this.system.handleSystemStats(request, services);
  }

  /**
   * 处理API信息请求
   */
  async handleApiInfo(request, services) {
    return await this.system.handleApiInfo(request, services);
  }

  /**
   * 处理音频轮询请求
   */
  async handlePollAudio(request, services, params) {
    return await this.episodes.handlePollAudio(request, services, params);
  }

  /**
   * 处理OPML导出
   */
  async handleOpmlExport(request, services) {
    return await this.feeds.handleOpmlExport(request, services);
  }
}
