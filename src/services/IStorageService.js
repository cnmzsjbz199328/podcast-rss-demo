/**
 * 存储服务接口
 * 定义文件存储的标准方法
 */
export class IStorageService {
  /**
   * 存储脚本和音频文件
   * @param {ScriptResult} scriptResult - 脚本结果
   * @param {VoiceResult} voiceResult - 语音结果
   * @returns {Promise<StorageResult>} 存储结果
   */
  async storeFiles(scriptResult, voiceResult) {
    throw new Error('Method storeFiles not implemented');
  }

  /**
   * 获取文件URL
   * @param {string} fileKey - 文件键名
   * @returns {Promise<string>} 文件URL
   */
  async getFileUrl(fileKey) {
    throw new Error('Method getFileUrl not implemented');
  }

  /**
   * 删除文件
   * @param {string} fileKey - 文件键名
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteFile(fileKey) {
    throw new Error('Method deleteFile not implemented');
  }

  /**
   * 验证服务配置
   * @returns {Promise<boolean>} 配置是否有效
   */
  async validateConfig() {
    throw new Error('Method validateConfig not implemented');
  }
}
