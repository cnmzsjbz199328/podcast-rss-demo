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
        name: '郭德纲相声风格',
        scriptPrompt: `请用郭德纲的相声风格，将以下新闻生动有趣地讲述出来。
要求：
1. 使用相声的语言特色，包括包袱、抖机灵
2. 加入适当的点评和调侃
3. 保持轻松幽默的基调
4. 适当控制长度，适合播客收听

新闻内容：
{news}`
      },
      'news-anchor': {
        name: '专业新闻播报',
        scriptPrompt: `请以专业新闻播报员的风格，将以下新闻整理成播客脚本。
要求：
1. 使用正式、客观的语言
2. 结构清晰，有逻辑顺序
3. 适当添加过渡语和总结
4. 保持新闻的专业性和准确性

新闻内容：
{news}`
      },
      'emotional': {
        name: '情感化风格',
        scriptPrompt: `请以温暖感性的风格，将以下新闻用故事化的方式讲述。
要求：
1. 融入情感元素，展现人文关怀
2. 使用温暖、共情的语言
3. 适当加入个人感悟和反思
4. 传递积极向上的价值观

新闻内容：
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
    // 格式化新闻内容
    const newsContent = news.map((item, index) => {
      return `${index + 1}. ${item.title}

${item.description}

来源: ${item.link}
时间: ${new Date(item.pubDate).toLocaleString('zh-CN')}

`;
    }).join('---\n\n');

    // 替换提示词中的占位符
    return styleConfig.scriptPrompt.replace('{news}', newsContent);
  }
}
