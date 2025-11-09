/**
 * 文本分块器 - 将长文本分割为适合TTS处理的块
 */

export class TextChunker {
  constructor(options = {}) {
    this.options = {
      maxWordsPerChunk: 100,    // 每个块最大词数
      maxCharsPerChunk: 800,    // 每个块最大字符数
      preferSentenceBreaks: true, // 优先在句子边界分割
      overlapWords: 5           // 块之间重叠的词数
    };

    Object.assign(this.options, options);
  }

  /**
   * 将文本分割为多个块
   * @param {string} text - 要分割的文本
   * @returns {Array<{text: string, startWord: number, endWord: number}>}
   */
  chunkText(text) {
    const { maxWordsPerChunk, maxCharsPerChunk, preferSentenceBreaks, overlapWords } = this.options;

    // 分割为单词
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const chunks = [];

    let currentChunk = [];
    let wordIndex = 0;

    while (wordIndex < words.length) {
      const chunkStartWord = Math.max(0, wordIndex - overlapWords);
      currentChunk = words.slice(chunkStartWord, wordIndex);

      // 继续添加单词直到达到限制
      while (wordIndex < words.length) {
        const candidateChunk = [...currentChunk, words[wordIndex]];
        const chunkText = candidateChunk.join(' ');
        const wordCount = candidateChunk.length;
        const charCount = chunkText.length;

        // 检查是否超过限制
        if (wordCount > maxWordsPerChunk || charCount > maxCharsPerChunk) {
          // 如果当前块为空或只有一个词，强制添加
          if (currentChunk.length <= 1) {
            currentChunk = candidateChunk;
            wordIndex++;
          }
          break;
        }

        currentChunk = candidateChunk;
        wordIndex++;

        // 如果优先句子边界，检查是否是句子结束
        if (preferSentenceBreaks && wordIndex > 0 && this._isSentenceEnd(words[wordIndex - 1])) {
          break;
        }
      }

      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join(' ');
        chunks.push({
          text: chunkText,
          startWord: Math.max(0, wordIndex - currentChunk.length - overlapWords),
          endWord: wordIndex - 1,
          wordCount: currentChunk.length,
          charCount: chunkText.length
        });
      }
    }

    return chunks;
  }

  /**
   * 检查单词是否是句子结束
   * @param {string} word - 单词
   * @returns {boolean}
   */
  _isSentenceEnd(word) {
    if (!word || typeof word !== 'string') return false;
    return /[.!?]$/.test(word) || word.includes('?') || word.includes('!') || word.includes('.');
  }

  /**
   * 估算文本块的音频时长
   * @param {string} text - 文本
   * @param {number} wordsPerMinute - 语速
   * @returns {number} 估算时长（秒）
   */
  estimateChunkDuration(text, wordsPerMinute = 150) {
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    return (wordCount / wordsPerMinute) * 60;
  }

  /**
   * 验证分块结果
   * @param {Array} chunks - 分块结果
   * @param {string} originalText - 原始文本
   * @returns {Object} 验证结果
   */
  validateChunks(chunks, originalText) {
    const originalWords = originalText.split(/\s+/).filter(word => word.length > 0);
    const totalChunkWords = chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
    const totalOverlapWords = (chunks.length - 1) * this.options.overlapWords;

    return {
      originalWordCount: originalWords.length,
      totalChunkWords: totalChunkWords,
      totalOverlapWords: totalOverlapWords,
      chunkCount: chunks.length,
      coverage: totalChunkWords / originalWords.length,
      isValid: Math.abs(totalChunkWords - totalOverlapWords - originalWords.length) <= chunks.length
    };
  }
}
