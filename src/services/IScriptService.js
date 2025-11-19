/**
 * 脚本生成服务接口
 * 定义AI脚本生成的标准方法
 */
export class IScriptService {
  /**
   * 生成Podcast脚本
   * @param {NewsItem[]} news - News数据
   * @param {string} style - 脚本风格
   * @returns {Promise<ScriptResult>} 生成的脚本结果
   */
  async generateScript(news, style) {
    throw new Error('Method generateScript not implemented');
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    throw new Error('Method validateConfig not implemented');
  }
}
