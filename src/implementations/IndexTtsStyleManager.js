/**
 * IndexTTS风格管理器 - 负责语音风格配置管理
 */

import { Logger } from '../utils/logger.js';

export class IndexTtsStyleManager {
  constructor() {
    this.logger = new Logger('IndexTtsStyleManager');
  }

  /**
   * 获取风格配置
   * @param {string} style - 风格名称
   * @returns {Object} 风格配置
   */
  getStyleConfig(style) {
    const styles = {
      'news-anchor': {
        name: '专业新闻播报',
        voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/kaluoling.mp3',
        emotionSample: null,
        params: {
          emo_weight: 0.3,
          vec1: 0,    // Happy
          vec2: 0,    // Angry
          vec3: 0,    // Sad
          vec4: 0,    // Fear
          vec5: 0,    // Hate
          vec6: 0,    // Low
          vec7: 0,    // Surprise
          vec8: 0.9   // Neutral
        }
      },
      'guo-de-gang': {
        name: '郭德纲相声风格',
        voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/guodegang.mp3',
        emotionSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/emotions/comedy.wav',
        params: {
          emo_weight: 0.9,
          vec1: 0.8,  // High Happy
          vec2: 0,    // Angry
          vec3: 0,    // Sad
          vec4: 0,    // Fear
          vec5: 0,    // Hate
          vec6: 0,    // Low
          vec7: 0.6,  // Surprise
          vec8: 0     // Neutral
        }
      },
      'emotional': {
        name: '情感化风格',
        voiceSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/voice/emotional.mp3',
        emotionSample: 'https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/emotions/emotional.wav',
        params: {
          emo_weight: 0.8,
          vec1: 0.3,  // Moderate Happy
          vec2: 0,    // Angry
          vec3: 0.4,  // Moderate Sad
          vec4: 0,    // Fear
          vec5: 0,    // Hate
          vec6: 0,    // Low
          vec7: 0.3,  // Moderate Surprise
          vec8: 0     // Neutral
        }
      }
    };

    const config = styles[style];
    if (!config) {
      throw new Error(`Unsupported style: ${style}`);
    }

    return config;
  }

  /**
   * 获取所有支持的风格
   * @returns {string[]} 支持的风格列表
   */
  getSupportedStyles() {
    return ['news-anchor', 'guo-de-gang', 'emotional'];
  }

  /**
   * 验证风格是否存在
   * @param {string} style - 风格名称
   * @returns {boolean} 是否支持
   */
  isStyleSupported(style) {
    return this.getSupportedStyles().includes(style);
  }
}
