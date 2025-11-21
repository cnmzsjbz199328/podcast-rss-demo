/** 限制：每个文件不超过200行，当前行数：283行 */
/**
 * 脚本格式化器 - 负责脚本的清理、格式化和统计
 * ⚠️ 注意：文件超出200行限制（283行），需要重构
 */

import { Logger } from '../../utils/logger.js';

export class ScriptFormatter {
  constructor() {
    this.logger = new Logger('ScriptFormatter');
  }

  /**
  * 清理和格式化脚本
  * 
  * 如果检测到JSON格式响应（topic-series风格），会尝试提取metadata
  * 返回值：
  * - 字符串：普通清理后的脚本
  * - 对象：{ content: string, metadata: { title, keywords, abstract } }
  */
  cleanAndFormatScript(script) {
  if (!script) return '';

    // ✅ 步骤0：检测并提取JSON metadata（用于topic-series）
    const jsonExtraction = this._extractJsonMetadata(script);
    if (jsonExtraction) {
      // 如果成功提取JSON，返回清理后的script + metadata
      const cleanedScript = this._performCleaning(jsonExtraction.script);
      
      this.logger.info('JSON metadata extracted from topic-series response', {
        hasTitle: !!jsonExtraction.metadata.title,
        hasKeywords: !!jsonExtraction.metadata.keywords,
        hasAbstract: !!jsonExtraction.metadata.abstract,
        scriptLength: cleanedScript.length
      });

      return {
        content: cleanedScript,
        metadata: jsonExtraction.metadata
      };
    }

    // 普通清理流程（非JSON格式）
    return this._performCleaning(script);
  }

  /**
   * 尝试提取JSON格式的metadata
   * @private
   * @returns {Object|null} { script: string, metadata: { title, keywords, abstract } } 或 null
   */
  _extractJsonMetadata(script) {
  if (!script) return null;

  // 确保script是字符串
  const scriptText = typeof script === 'string' ? script : JSON.stringify(script);

  // 检测JSON特征
    const hasJsonMarkers = scriptText.includes('"title"') &&
                          scriptText.includes('"script"') &&
                          (scriptText.includes('"keywords"') || scriptText.includes('"abstract"'));

    if (!hasJsonMarkers) {
      return null; // 不是JSON格式
    }

    try {
      // 尝试匹配JSON对象（可能包含在其他文本中）
      const jsonMatch = scriptText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('JSON markers found but no valid JSON object structure');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 验证必需字段
      if (!parsed.script || typeof parsed.script !== 'string') {
        this.logger.warn('JSON parsed but missing valid script field');
        return null;
      }

      // 提取metadata
      const metadata = {
        title: parsed.title || null,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : null,
        abstract: parsed.abstract || null
      };

      return {
        script: parsed.script,
        metadata
      };

    } catch (error) {
      this.logger.warn('Failed to parse JSON metadata', {
        error: error.message,
        scriptPreview: script.substring(0, 200)
      });
      return null;
    }
  }

  /**
   * 执行实际的脚本清理
   * @private
   */
  _performCleaning(script) {
  // 记录清理前的脚本（用于监控）
  const originalScript = script;

  let cleaned = script
  .trim();

  // 移除Markdown格式符号 - 第一步：移除代码块
  cleaned = cleaned
  // 移除代码块标记（多行）
      .replace(/```[\s\S]*?```/g, '')
      // 移除行内代码标记
      .replace(/`([^`]+)`/g, '$1');

    // 移除Markdown格式符号 - 第二步：移除强调符号
    cleaned = cleaned
      // 移除粗体和斜体：**text** 或 *text* 或 _text_ 或 ~~text~~
      .replace(/(\*\*|\*|_|~){1,2}([^*\*_~]+)(\*\*|\*|_|~){1,2}/g, '$2')
      // 移除单独的强调符号（兜底处理）
      .replace(/(\*\*|\*|_|~){1,2}/g, '');

    // 移除Markdown格式符号 - 第三步：移除标题和列表
    cleaned = cleaned
      // 移除标题：# ## ### 等
      .replace(/^#{1,6}\s+/gm, '')
      // 移除无序列表：- * +
      .replace(/^[-*+]\s+/gm, '')
      // 移除有序列表：1. 2. 3. 等
      .replace(/^\d+\.\s+/gm, '');

    // 移除Markdown格式符号 - 第四步：移除引用和分割线
    cleaned = cleaned
      // 移除引用：>
      .replace(/^>\s+/gm, '')
      // 移除水平分割线：--- 或 *** 或 ___
      .replace(/^[-*_]{3,}$/gm, '');

    // 处理空白行和格式化
    cleaned = cleaned
      // 移除多余的空白行
      .replace(/\n{3,}/g, '\n\n')
      // 确保段落格式
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');

    // 统计Markdown符号出现频率
    const markdownStats = this._analyzeMarkdownSymbols(originalScript);

    // 记录清理统计（用于监控）
    const originalStats = this._getBasicStats(originalScript);
    const cleanedStats = this._getBasicStats(cleaned);

    // 记录详细的清理报告
    this.logger.info('Script formatting completed', {
      originalChars: originalStats.charCount,
      cleanedChars: cleanedStats.charCount,
      charsRemoved: originalStats.charCount - cleanedStats.charCount,
      originalLines: originalStats.lineCount,
      cleanedLines: cleanedStats.lineCount,
      markdownSymbolsFound: markdownStats.totalSymbols,
      markdownBreakdown: markdownStats.breakdown,
      cleanupEffective: markdownStats.totalSymbols > 0
    });

    // 如果发现大量Markdown符号，记录警告
    if (markdownStats.totalSymbols > 10) {
      this.logger.warn('High Markdown symbol count detected', {
        symbolCount: markdownStats.totalSymbols,
        breakdown: markdownStats.breakdown,
        scriptPreview: originalScript.substring(0, 200) + '...'
      });
    }

    return cleaned;
  }

  /**
   * 计算字数
   */
  countWords(text) {
    if (!text) return 0;

    // 中英文混合计数
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text.split(/\s+/).filter(word => word.length > 0).length;

    return chineseChars + englishWords;
  }

  /**
   * 分析Markdown符号出现频率
   * @private
  */
  _analyzeMarkdownSymbols(script) {
    if (!script) return { totalSymbols: 0, breakdown: {} };

    const patterns = {
      'bold/italic': /(\*\*|\*|_|~){1,2}/g,
      'headers': /^#{1,6}\s+/gm,
      'unordered_lists': /^[-*+]\s+/gm,
      'ordered_lists': /^\d+\.\s+/gm,
      'blockquotes': /^>\s+/gm,
      'horizontal_rules': /^[-*_]{3,}$/gm,
      'inline_code': /`([^`]+)`/g,
      'code_blocks': /```[\s\S]*?```/g
    };

    const breakdown = {};
    let totalSymbols = 0;

    for (const [name, pattern] of Object.entries(patterns)) {
      const matches = script.match(pattern);
      const count = matches ? matches.length : 0;
      breakdown[name] = count;
      totalSymbols += count;
    }

    return { totalSymbols, breakdown };
  }

  /**
  * 获取基本统计信息（不进行格式化）
  * @private
   */
  _getBasicStats(script) {
  if (!script) return { wordCount: 0, lineCount: 0, charCount: 0 };

  const wordCount = this.countWords(script);
    const lineCount = script.split('\n').length;
  const charCount = script.length;

  return {
  wordCount,
  lineCount,
    charCount,
      avgWordsPerLine: lineCount > 0 ? Math.round(wordCount / lineCount) : 0
    };
  }

  /**
    * 获取脚本统计信息
    */
  getScriptStats(script) {
    const cleaned = this.cleanAndFormatScript(script);
    // 处理cleanAndFormatScript可能返回对象的情况
    const scriptText = typeof cleaned === 'object' && cleaned.content ? cleaned.content : cleaned;
    const wordCount = this.countWords(scriptText);
    const lineCount = scriptText.split('\n').length;
    const charCount = scriptText.length;
    return {
      wordCount,
      lineCount,
      charCount,
      avgWordsPerLine: lineCount > 0 ? Math.round(wordCount / lineCount) : 0
    };
  }

  /**
   * 验证脚本质量
   */
  validateScript(script) {
    if (!script || script.trim().length === 0) {
      return { valid: false, reason: 'Script is empty' };
    }

    const stats = this.getScriptStats(script);

    if (stats.wordCount < 50) {
      return { valid: false, reason: 'Script is too short' };
    }

    if (stats.wordCount > 2000) {
      return { valid: false, reason: 'Script is too long' };
    }

    return { valid: true, stats };
  }
}
