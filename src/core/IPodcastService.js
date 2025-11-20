/**
 * 播客服务接口
 * 定义播客生成的统一业务接口，供 Handler 层调用
 *
 * 实现类：
 * - NewsPodcastService: 新闻播客服务
 * - TopicPodcastService: 主题播客服务
 */
export class IPodcastService {
  /**
   * 生成播客（同步模式）
   * @param {Object} options - 生成选项
   * @param {string} options.style - 播客风格 ('news-anchor', 'topic-explainer' 等)
   * @param {Object} [options.params] - 业务参数
   *   对于新闻播客：空对象
   *   对于主题播客：{ topicId: string }
   * @returns {Promise<PodcastResult>} 播客生成结果
   */
  async generatePodcast(options) {
    throw new Error('Method generatePodcast not implemented');
  }

  /**
   * 生成播客（异步模式）
   * @param {Object} options - 生成选项
   * @param {string} options.style - 播客风格
   * @param {Object} [options.params] - 业务参数
   * @returns {Promise<{episodeId: string, status: string, ttsEventId?: string}>} 异步任务信息
   */
  async generatePodcastAsync(options) {
    throw new Error('Method generatePodcastAsync not implemented');
  }

  /**
   * 查询播客列表
   * @param {Object} filters - 过滤条件
   * @param {string} [filters.status] - 状态过滤 ('draft', 'published', 'archived')
   * @param {number} [filters.limit] - 限制数量，默认20
   * @param {number} [filters.offset] - 偏移量，默认0
   * @param {Object} [filters.params] - 业务特定参数
   *   对于主题播客：{ topicId: string }
   * @returns {Promise<PodcastInfo[]>} 播客列表
   */
  async getPodcasts(filters) {
    throw new Error('Method getPodcasts not implemented');
  }

  /**
   * 根据ID查询播客
   * @param {string} id - 播客ID（episode_id）
   * @returns {Promise<PodcastInfo>} 播客信息
   */
  async getPodcastById(id) {
    throw new Error('Method getPodcastById not implemented');
  }

  /**
   * 轮询异步生成状态
   * @param {string} episodeId - 播客ID
   * @returns {Promise<{status: string, podcast?: PodcastInfo, error?: string}>} 生成状态
   */
  async pollGeneration(episodeId) {
    throw new Error('Method pollGeneration not implemented');
  }
}

/**
 * PodcastResult 类型定义
 * @typedef {Object} PodcastResult
 * @property {string} episodeId - 剧集ID
 * @property {string} status - 生成状态 ('completed', 'failed')
 * @property {string} [audioUrl] - 音频URL
 * @property {number} [duration] - 时长(秒)
 * @property {string} [transcript] - 脚本内容
 * @property {string} [error] - 错误信息（如果失败）
 */

/**
 * PodcastInfo 类型定义
 * @typedef {Object} PodcastInfo
 * @property {string} episodeId - 剧集ID
 * @property {string} title - 标题
 * @property {string} [description] - 描述
 * @property {string} status - 状态
 * @property {string} [audioUrl] - 音频URL
 * @property {number} [duration] - 时长
 * @property {string} createdAt - 创建时间
 * @property {string} [publishedAt] - 发布时间
 * @property {Object} [metadata] - 额外元数据
 */
