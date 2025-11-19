/**
 * RSS服务接口
 * 定义News获取的标准方法
 */
export class IRssService {
  /**
   * 获取News列表
   * @param {Object} options - 获取选项
   * @param {number} options.limit - 获取数量限制
   * @param {string} options.category - News分类
   * @returns {Promise<NewsItem[]>} News列表
   */
  async fetchNews(options = {}) {
    throw new Error('Method fetchNews not implemented');
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    throw new Error('Method validateConfig not implemented');
  }
}
