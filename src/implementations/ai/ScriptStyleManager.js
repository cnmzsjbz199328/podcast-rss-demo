/** 限制：每个文件不超过200行，当前行数：89行 */
/**
 * 脚本风格管理器 - 负责脚本风格配置和提示词管理
 */

import { Logger } from '../../utils/logger.js';

export class ScriptStyleManager {
  constructor() {
    this.logger = new Logger('ScriptStyleManager');
  }

  /**
  * 获取风格配置
  */
  getStyleConfig(style) {
  const styleConfigs = {
  'guo-de-gang': {
  name: 'Guo Degang Crosstalk Style',
  scriptPrompt: `Please narrate the following news in ENGLISH, adapting Guo Degang's crosstalk style with witty remarks and humor. Create pure spoken text as one continuous paragraph without any formatting marks or stage directions.

Requirements:
1. Write ENTIRELY in ENGLISH - do not use any Chinese characters or text
2. Write as ONE CONTINUOUS PARAGRAPH with no line breaks
3. Adapt crosstalk language features, including punchlines and witty remarks
4. Add appropriate comments and banter in English
5. Maintain a light-hearted and humorous tone
6. Control the length appropriately for podcast listening
7. Write only the words that will be spoken aloud
8. Do NOT include any text in parentheses, brackets, or special formatting

News content:
{news}`
      },
  'news-anchor': {
  name: 'Professional News Broadcasting',
  scriptPrompt: `Please create a concise, continuous podcast script in ENGLISH of about 5 minutes, in a style similar to a professional news anchor. The script should be pure spoken text as one continuous paragraph without any line breaks, formatting marks, or special characters.

  Requirements:
  1. Write ENTIRELY in ENGLISH - do not use any Chinese characters or text
  2. Write as ONE CONTINUOUS PARAGRAPH with no line breaks
  3. Start with: "Welcome to Tom Podcasts. Today we're covering..."
  4. Use formal, objective language suitable for broadcast
  5. Include smooth transitions between different news items
  6. End with a brief conclusion or closing statement
  7. Maintain professional news anchor tone throughout
  8. Do NOT include any line breaks, empty lines, or paragraph breaks
  9. Do NOT include any text in parentheses, brackets, or special formatting
  10. Do NOT include music cues or stage directions
  11. Write only the words that will be spoken aloud as one flowing narrative

  News content:
  {news}`
      },
  'emotional': {
  name: 'Emotional Storytelling Style',
  scriptPrompt: `Please narrate the following news in ENGLISH in a warm and moving narrative style for approximately 5 minutes. Create pure spoken text as one continuous paragraph without any formatting marks or stage directions.

Requirements:
1. Write ENTIRELY in ENGLISH - do not use any Chinese characters or text
2. Write as ONE CONTINUOUS PARAGRAPH with no line breaks
3. Incorporate emotional elements, showing human care
4. Use warm, empathetic language
5. Include personal reflections and insights
6. Convey positive and uplifting values
7. Write only the words that will be spoken aloud
8. Do NOT include any text in parentheses, brackets, or special formatting

News content:
{news}`},
   'topic-explainer': {
   name: 'Topic Explainer Style',
   scriptPrompt: `Please create an educational podcast script in ENGLISH that explains and explores the given topic in depth for approximately 5 minutes. Create pure spoken text as one continuous paragraph without any formatting marks or stage directions.

   Requirements:
   1. Write ENTIRELY in ENGLISH - do not use any Chinese characters or text
   2. Write as ONE CONTINUOUS PARAGRAPH with no line breaks
   3. Start with: "Welcome to Tom Podcasts. Today's topic is..."
   4. Explain the topic clearly and comprehensively
   5. Use educational, informative language suitable for learning
   6. Include key facts, context, and insights about the topic
   7. Structure the explanation logically from introduction to conclusion
   8. Maintain an engaging and accessible tone for listeners
   9. End with a brief summary or takeaway
   10. Write only the words that will be spoken aloud
   11. Do NOT include any text in parentheses, brackets, or special formatting
   12. Focus on making complex topics understandable

   Topic content:
   {news}`
      },
   'topic-series': {
   name: 'Topic Series Generation',
   scriptPrompt: `{news}`
      }
  };

    const config = styleConfigs[style];
    if (!config) {
      throw new Error(`Unsupported style: ${style}`);
    }

    return config;
  }

  /**
   * 获取所有支持的风格
   */
  getSupportedStyles() {
  return ['guo-de-gang', 'news-anchor', 'emotional', 'topic-explainer', 'topic-series'];
  }

  /**
   * 验证风格是否存在
   */
  isStyleSupported(style) {
    return this.getSupportedStyles().includes(style);
  }

  /**
  * 构建提示词
  */
  buildPrompt(news, styleConfig) {
    // ✅ 对于 topic-series 风格，直接返回原始内容（不进行模板包装）
    if (styleConfig.name === 'Topic Series Generation') {
      this.logger.info('Using topic-series style: passing through user prompt directly');
      
      if (news && news.length === 1 && news[0]) {
        const directPrompt = news[0].description || news[0].content || '';
        this.logger.debug('Topic series prompt length', { length: directPrompt.length });
        return directPrompt;
      }
    }

    // 正常的新闻播客提示词构建
    const newsContent = news.map((item, index) => {
      return `${index + 1}. ${item.title}

${item.description}

Source: ${item.link || 'N/A'}
Published: ${item.pubDate ? new Date(item.pubDate).toLocaleString('en-US') : 'N/A'}

`;
    }).join('---\n\n');

    // 替换提示词中的占位符
    return styleConfig.scriptPrompt.replace('{news}', newsContent);
  }
}
