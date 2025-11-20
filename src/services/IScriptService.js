/**
* 脚本生成服务接口
* 定义AI脚本生成的标准方法，支持多种内容类型
*/
export class IScriptService {
/**
* 生成Podcast脚本
* @param {Object} contentData - 内容数据
* @param {string} contentData.type - 内容类型 ('news' | 'topic')
* @param {any} contentData.data - 内容数据（新闻数组或主题信息）
* @param {string} style - 脚本风格 ('news-anchor', 'topic-explainer' 等)
 * @returns {Promise<ScriptResult>} 生成的脚本结果
*/
async generateScript(contentData, style) {
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

/**
 * ContentData 类型定义
 * @typedef {Object} ContentData
 * @property {string} type - 内容类型 ('news' | 'topic')
 * @property {any} data - 内容数据
 *   - 对于 'news': NewsItem[] 数组
 *   - 对于 'topic': { topic: Object, content: any }
 */
