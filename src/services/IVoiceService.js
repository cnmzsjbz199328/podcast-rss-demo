/**
 * 语音生成服务接口
 * 定义音频生成的标准方法
 */
export class IVoiceService {
  /**
   * 生成音频文件
   * @param {string} script - 脚本文本
   * @param {string} style - 语音风格
   * @returns {Promise<VoiceResult>} 音频生成结果
   */
  async generateAudio(script, style) {
    throw new Error('Method generateAudio not implemented');
  }

  /**
  * 验证服务配置
  * @returns {Promise<boolean>} 配置是否有效
  */
  async validateConfig() {
  throw new Error('Method validateConfig not implemented');
  }

  /**
   * 发起异步语音生成（可选实现，用于长文本）
   * @param {string} script - 脚本文本
   * @param {string} style - 语音风格
   * @param {string} episodeId - 集ID
   * @returns {Promise<AsyncGenerationResult>} 异步生成结果
   */
  async initiateGeneration(script, style, episodeId) {
    throw new Error('Method initiateGeneration not implemented');
  }

  /**
  * 轮询异步生成结果（可选实现，用于长文本）
  * @param {string} episodeId - 集ID
  * @param {string} eventId - 事件ID
  * @returns {Promise<PollResult>} 轮询结果
  */
  async pollAndProcess(episodeId, eventId) {
  // 默认实现：不支持轮询，直接抛出错误
    throw new Error('Async polling not supported by this provider');
  }
}
