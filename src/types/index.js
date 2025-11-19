/**
 * 类型定义
 */

/**
 * News项类型
 * @typedef {Object} NewsItem
 * @property {string} title - News标题
 * @property {string} description - News描述
 * @property {string} link - News链接
 * @property {string} pubDate - 发布时间
 * @property {string} category - News分类
 * @property {string} guid - 唯一标识符
 */

/**
 * 脚本结果类型
 * @typedef {Object} ScriptResult
 * @property {string} content - 脚本内容
 * @property {string} style - 脚本风格
 * @property {number} wordCount - 字数统计
 * @property {string} generatedAt - 生成时间
 * @property {Object} metadata - 元数据
 */

/**
 * 语音结果类型
 * @typedef {Object} VoiceResult
 * @property {Buffer|Blob} audioData - 音频数据
 * @property {string} format - 音频格式 (mp3/wav)
 * @property {number} duration - 时长(秒)
 * @property {number} fileSize - 文件大小(字节)
 * @property {string} style - 语音风格
 * @property {Object} metadata - 元数据
 */

/**
 * 存储结果类型
 * @typedef {Object} StorageResult
 * @property {string} scriptUrl - 脚本文件URL
 * @property {string} audioUrl - 音频文件URL
 * @property {string} scriptKey - 脚本文件键名
 * @property {string} audioKey - 音频文件键名
 * @property {Object} metadata - 存储元数据
 */

/**
 * Podcast剧集类型
 * @typedef {Object} PodcastEpisode
 * @property {string} title - 剧集标题
 * @property {string} description - 剧集描述
 * @property {string} audioUrl - 音频URL
 * @property {string} scriptUrl - 脚本URL
 * @property {string} pubDate - 发布时间
 * @property {number} duration - 时长(秒)
 * @property {string} style - Podcast风格
 * @property {string} guid - 唯一标识符
 */

/**
 * 服务配置类型
 * @typedef {Object} ServiceConfig
 * @property {Object} rss - RSS服务配置
 * @property {Object} script - 脚本服务配置
 * @property {Object} voice - 语音服务配置
 * @property {Object} storage - 存储服务配置
 */

/**
 * 风格配置类型
 * @typedef {Object} StyleConfig
 * @property {string} name - 风格名称
 * @property {string} scriptPrompt - 脚本生成提示词
 * @property {string} voiceSample - 语音样本文件名
 * @property {string} emotionSample - 情感样本文件名
 * @property {Object} params - 额外参数
 */

/**
 * API响应类型
 * @typedef {Object} ApiResponse
 * @property {boolean} success - 是否成功
 * @property {Object|string} data - 响应数据
 * @property {string} error - 错误信息
 * @property {string} code - 错误代码
 */
