/**
 * 数据验证工具
 */

/**
 * 验证News项数据
 * @param {NewsItem} item - News项
 * @returns {boolean} 是否有效
 */
export function validateNewsItem(item) {
  if (!item || typeof item !== 'object') return false;

  const required = ['title', 'description', 'link', 'pubDate'];
  for (const field of required) {
    if (!item[field] || typeof item[field] !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * 验证脚本结果
 * @param {ScriptResult} script - 脚本结果
 * @returns {boolean} 是否有效
 */
export function validateScriptResult(script) {
  if (!script || typeof script !== 'object') return false;

  if (!script.content || typeof script.content !== 'string') return false;
  if (!script.style || typeof script.style !== 'string') return false;

  return true;
}

/**
 * 验证语音结果
 * @param {VoiceResult} voice - 语音结果
 * @returns {boolean} 是否有效
 */
export function validateVoiceResult(voice) {
  if (!voice || typeof voice !== 'object') return false;

  // 异步处理：需要eventId，不需要audioData
  if (voice.isAsync) {
    if (!voice.eventId || typeof voice.eventId !== 'string') return false;
    if (!voice.format || typeof voice.format !== 'string') return false;
    if (!voice.style || typeof voice.style !== 'string') return false;
    return true;
  }

  // 同步处理：需要audioData
  if (!voice.audioData) return false;
  if (!voice.format || typeof voice.format !== 'string') return false;
  if (!voice.style || typeof voice.style !== 'string') return false;

  return true;
}

/**
 * 验证存储结果
 * @param {StorageResult} storage - 存储结果
 * @returns {boolean} 是否有效
 */
export function validateStorageResult(storage) {
  if (!storage || typeof storage !== 'object') return false;

  if (!storage.scriptUrl || typeof storage.scriptUrl !== 'string') return false;
  
  // 异步生成时audioUrl可能为null
  // if (!storage.audioUrl || typeof storage.audioUrl !== 'string') return false;

  return true;
}

/**
 * 验证URL格式
 * @param {string} url - URL字符串
 * @returns {boolean} 是否有效
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 验证文件大小
 * @param {number} size - 文件大小(字节)
 * @param {number} maxSize - 最大大小(字节)
 * @returns {boolean} 是否有效
 */
export function validateFileSize(size, maxSize = 50 * 1024 * 1024) { // 50MB
  return typeof size === 'number' && size > 0 && size <= maxSize;
}

/**
 * 验证风格配置
 * @param {StyleConfig} style - 风格配置
 * @returns {boolean} 是否有效
 */
export function validateStyleConfig(style) {
  if (!style || typeof style !== 'object') return false;

  if (!style.name || typeof style.name !== 'string') return false;
  if (!style.scriptPrompt || typeof style.scriptPrompt !== 'string') return false;

  return true;
}

/**
 * 验证API密钥
 * @param {string} apiKey - API密钥
 * @returns {boolean} 是否有效
 */
export function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;

  // 基本长度检查
  return apiKey.length >= 20;
}
