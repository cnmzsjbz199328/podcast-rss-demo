/**
 * 文件操作工具
 */

import fs from 'fs/promises';
import path from 'path';
import { validateFileSize } from './validator.js';

/**
 * 生成文件键名
 * @param {string} prefix - 前缀
 * @param {string} style - 风格
 * @param {string} extension - 扩展名
 * @returns {string} 文件键名
 */
export function generateFileKey(prefix, style, extension) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const randomId = Math.random().toString(36).substring(2, 8);
  return `${prefix}/${timestamp}-${style}-${randomId}.${extension}`;
}

/**
 * 获取文件大小
 * @param {Buffer|Blob} data - 文件数据
 * @returns {number} 文件大小
 */
export function getFileSize(data) {
  if (data instanceof Buffer) {
    return data.length;
  }
  if (data instanceof Blob) {
    return data.size;
  }
  return 0;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化的文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 验证音频文件格式
 * @param {string} filename - 文件名
 * @returns {boolean} 是否支持的音频格式
 */
export function isValidAudioFormat(filename) {
  const supportedFormats = ['.mp3', '.wav', '.m4a', '.aac'];
  const ext = path.extname(filename).toLowerCase();
  return supportedFormats.includes(ext);
}

/**
 * 验证脚本文件格式
 * @param {string} filename - 文件名
 * @returns {boolean} 是否支持的脚本格式
 */
export function isValidScriptFormat(filename) {
  const supportedFormats = ['.txt', '.json', '.md'];
  const ext = path.extname(filename).toLowerCase();
  return supportedFormats.includes(ext);
}

/**
 * 创建目录（如果不存在）
 * @param {string} dirPath - 目录路径
 * @returns {Promise<void>}
 */
export async function ensureDirectory(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 清理临时文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<void>}
 */
export async function cleanupTempFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // 静默失败，文件可能已被删除
    console.warn(`Failed to cleanup temp file: ${filePath}`, error.message);
  }
}

/**
 * 获取文件的MIME类型
 * @param {string} filename - 文件名
 * @returns {string} MIME类型
 */
export function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();

  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.md': 'text/markdown'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 提取文件名（不含扩展名）
 * @param {string} filename - 文件名
 * @returns {string} 文件名（不含扩展名）
 */
export function getFilenameWithoutExtension(filename) {
  return path.basename(filename, path.extname(filename));
}

/**
 * 安全的文件名
 * @param {string} name - 原始名称
 * @returns {string} 安全文件名
 */
export function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9\-_\.]/g, '_') // 只保留字母数字和特定字符
    .replace(/_{2,}/g, '_') // 多个下划线替换为单个
    .replace(/^_|_$/g, ''); // 移除开头和结尾的下划线
}
