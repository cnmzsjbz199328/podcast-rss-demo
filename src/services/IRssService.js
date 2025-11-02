/**
 * RSS服务接口
 * 定义新闻获取的标准方法
 */
export class IRssService {
  /**
   * 获取新闻列表
   * @param {Object} options - 获取选项
   * @param {number} options.limit - 获取数量限制
   * @param {string} options.category - 新闻分类
   * @returns {Promise<NewsItem[]>} 新闻列表
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
