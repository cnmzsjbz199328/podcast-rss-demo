/** 限制：每个文件不超过200行，当前行数：89行 */
/**
 * 脚本风格管理器 - 负责脚本风格配置和提示词管理
 */

import { Logger } from '../utils/logger.js';

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
  scriptPrompt: `Please narrate the following news in Guo Degang's crosstalk style. Create pure spoken text as one continuous paragraph without any formatting marks or stage directions.

Requirements:
1. Write as ONE CONTINUOUS PARAGRAPH with no line breaks
2. Use crosstalk language features, including punchlines and witty remarks
3. Add appropriate comments and banter
4. Maintain a light-hearted and humorous tone
5. Control the length appropriately for podcast listening
6. Write only the words that will be spoken aloud
7. Do NOT include any text in parentheses, brackets, or special formatting

News content:
{news}`
      },
  'news-anchor': {
  name: 'Professional News Broadcasting',
  scriptPrompt: `Please create a concise, continuous podcast script of about 5 minutes, in a style similar to a professional news anchor. The script should be pure spoken text as one continuous paragraph without any line breaks, formatting marks, or special characters.

Requirements:
1. Write as ONE CONTINUOUS PARAGRAPH with no line breaks
2. Use formal, objective language suitable for broadcast
3. Include smooth transitions between different news items
4. Start with a natural introduction and end with a conclusion
5. Maintain professional news anchor tone throughout
6. Do NOT include any line breaks, empty lines, or paragraph breaks
7. Do NOT include any text in parentheses, brackets, or special formatting
8. Do NOT include music cues or stage directions
9. Write only the words that will be spoken aloud as one flowing narrative

News content:
{news}`
      },
  'emotional': {
  name: 'Emotional Storytelling Style',
  scriptPrompt: `Please narrate the following news in a warm and moving narrative style for approximately 5 minutes. Create pure spoken text as one continuous paragraph without any formatting marks or stage directions.

Requirements:
1. Write as ONE CONTINUOUS PARAGRAPH with no line breaks
2. Incorporate emotional elements, showing human care
3. Use warm, empathetic language
4. Include personal reflections and insights
5. Convey positive and uplifting values
6. Write only the words that will be spoken aloud
7. Do NOT include any text in parentheses, brackets, or special formatting

News content:
{news}`
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
    return ['guo-de-gang', 'news-anchor', 'emotional'];
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
    // 格式化News内容
    const newsContent = news.map((item, index) => {
      return `${index + 1}. ${item.title}

${item.description}

Source: ${item.link}
Published: ${new Date(item.pubDate).toLocaleString('en-US')}

`;
    }).join('---\n\n');

    // 替换提示词中的占位符
    return styleConfig.scriptPrompt.replace('{news}', newsContent);
  }
}
