import { Logger } from '../utils/logger.js';

/**
 * 主题系列播客生成器
 * 负责系列延续逻辑、提示词构建、去重机制
 */
export class TopicSeriesGenerator {
  constructor(topicRepository, topicPodcastRepository, scriptService, config = {}) {
    this.topicRepository = topicRepository;
    this.topicPodcastRepository = topicPodcastRepository;
    this.scriptService = scriptService;
    this.config = config;
    this.logger = new Logger('TopicSeriesGenerator');
  }

  /**
   * 为主题生成下一集播客
   * @param {number} topicId - 主题ID
   * @returns {Promise<Object>} 生成的剧集信息
   */
  async generateNextEpisode(topicId) {
    // 1. 获取主题信息
    const topic = await this.topicRepository.getTopic(topicId);
    if (!topic) {
      throw new Error(`Topic not found: ${topicId}`);
    }

    // 2. 检查是否需要生成（根据时间间隔）
    if (!this._shouldGenerate(topic)) {
      this.logger.info('Topic generation skipped due to interval', {
        topicId,
        lastGeneratedAt: topic.last_generated_at,
        intervalHours: topic.generation_interval_hours
      });
      return null;
    }

    // 3. 获取历史剧集（最近10集）
    const recentEpisodes = await this.topicPodcastRepository.getRecentEpisodes(
      topicId,
      10
    );

    // 4. 计算下一集编号（实时查询，不依赖 episode_count）
    const currentMaxEpisode = await this.topicPodcastRepository.getMaxEpisodeNumber(topicId);
    const nextEpisodeNumber = (currentMaxEpisode || 0) + 1;

    // 5. 构建智能提示词
    const prompt = this._buildPrompt(topic, recentEpisodes, nextEpisodeNumber);

    // 6. 调用AI生成剧集内容
  const episodeContent = await this._generateEpisodeContent(prompt, topic, nextEpisodeNumber);

    // 7. 返回剧集信息
    return {
      episodeNumber: nextEpisodeNumber,
      title: episodeContent.title,
      keywords: episodeContent.keywords.join(', '),
      abstract: episodeContent.abstract,
      script: episodeContent.script,
      topicId
    };
  }

  /**
   * 检查是否应该生成新剧集
   * @private
   */
  _shouldGenerate(topic) {
    if (!topic.last_generated_at) {
      return true; // 第一次生成
    }

    const intervalHours = topic.generation_interval_hours ?? 24;
    const lastGenerated = new Date(topic.last_generated_at);
    const now = new Date();
    const hoursSinceLastGen = (now - lastGenerated) / (1000 * 60 * 60);

    return hoursSinceLastGen >= intervalHours;
  }

  /**
   * 构建智能提示词
   * @private
   */
  _buildPrompt(topic, recentEpisodes, nextEpisodeNumber) {
    const isFirstEpisode = recentEpisodes.length === 0;

    this.logger.error('_buildPrompt called', {
      topicId: topic.id,
      recentEpisodesCount: recentEpisodes.length,
      nextEpisodeNumber,
      isFirstEpisode
    });

    if (isFirstEpisode) {
      const prompt = this._buildFirstEpisodePrompt(topic);
      this.logger.error('Using first episode prompt', {
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + '...'
      });
      return prompt;
    } else {
      const prompt = this._buildContinuationPrompt(topic, recentEpisodes, nextEpisodeNumber);
      this.logger.error('Using continuation prompt', {
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + '...'
      });
      return prompt;
    }
  }

  /**
   * 构建第1集提示词
   * @private
   */
  _buildFirstEpisodePrompt(topic) {
    return `Create a podcast episode about "${topic.title}".

Topic: ${topic.description}

Write a 600-word podcast script that introduces this topic. Make it conversational and engaging, like a professional podcast host speaking to listeners.

Important:
- Do NOT include any music or sound effect cues (such as "(Intro Music fades in and out)").
- Do NOT use placeholders like "[Your Name]" or generic host introductions. If a host is needed, use a natural introduction without mentioning the host's name.
- The script must be ready for direct voice synthesis, with no extraneous instructions or cues.

Structure:
- Start with an engaging introduction (without music or host name placeholders)
- Explain the main topic clearly
- Provide practical examples or insights
- End with a summary

Return your response in this exact JSON format:
{
  "title": "Episode Title Here",
  "keywords": ["keyword1", "keyword2"],
  "abstract": "Brief 100-150 word summary of the episode content",
  "script": "The complete 600-word podcast script here"
}

Make sure the script is informative, entertaining, and suitable for direct speech synthesis.`.trim();
  }

  /**
   * 构建延续集提示词
   * @private
   */
  _buildContinuationPrompt(topic, recentEpisodes, nextEpisodeNumber) {
    const usedKeywords = recentEpisodes
      .map(ep => ep.keywords)
      .filter(k => k)
      .join(', ');

    const episodeHistory = recentEpisodes
      .map(ep => `Episode ${ep.episode_number}: ${ep.title} (Keyword: ${ep.keywords})`)
      .join('\n');

    return `Create episode ${nextEpisodeNumber} for the podcast series "${topic.title}".

Topic: ${topic.description}

Previous episodes: ${episodeHistory}

Avoid repeating these topics: ${usedKeywords}

Write a 600-word podcast script that explores a new aspect of this topic. Make it conversational and build on previous episodes while introducing fresh insights.

Important:
- Do NOT include any music or sound effect cues (such as "(Intro Music fades in and out)").
- Do NOT use placeholders like "[Your Name]" or generic host introductions. If a host is needed, use a natural introduction without mentioning the host's name.
- The script must be ready for direct voice synthesis, with no extraneous instructions or cues.

Structure:
- Reference previous episodes briefly (without music or host name placeholders)
- Introduce a new angle or sub-topic
- Provide detailed explanation with examples
- Connect back to the main theme
- End with forward-looking thoughts

Return your response in this exact JSON format:
{
  "title": "Episode Title Here",
  "keywords": ["keyword1", "keyword2"],
  "abstract": "Brief 100-150 word summary of the episode content",
  "script": "The complete 600-word podcast script here"
}

Make it engaging, informative, and suitable for direct speech synthesis.`.trim();
  }

  /**
   * 调用AI生成剧集内容
   * @private
   */
  async _generateEpisodeContent(prompt, topic, episodeNumber) {
    try {
      // 准备适合AI调用的数据格式
      const aiData = {
        title: topic.title,
        description: prompt, // 直接传递完整的提示词
        content: prompt,
        source: 'topic-series'
      };

      // 直接使用注入的scriptService
      // ✅ 使用 topic-series 风格（直接传递，不进行模板包装）
      const result = await this.scriptService.generateScript(
        {
          type: 'topic-series', // 使用topic-series类型
          data: aiData // 直接传递aiData对象，而不是数组
        },
        'topic-series' // 使用新的 topic-series 风格
      );

      const normalizedContent = this._extractContentText(result.content);

      // 解析JSON响应
      this.logger.info('AI response received', {
        contentLength: normalizedContent.length,
        contentPreview: normalizedContent.substring(0, 200) + '...',
        rawContent: normalizedContent.substring(0, 500),
        // ✅ 检测是否包含metadata
        hasMetadata: typeof result.content === 'object' && result.content.metadata
      });

      // ✅ 如果ScriptFormatter已经提取了metadata，直接使用
      if (typeof result.content === 'object' && result.content.metadata) {
        const { content, metadata } = result.content;

        if (!metadata.title || !metadata.keywords || !metadata.abstract || !content) {
          throw new Error('Metadata from ScriptFormatter missing required fields');
        }

        this.logger.info('Using metadata from ScriptFormatter', {
          hasTitle: !!metadata.title,
          hasKeywords: Array.isArray(metadata.keywords) ? metadata.keywords.length : 'invalid',
          hasAbstract: !!metadata.abstract,
          scriptLength: content?.length || 0
        });

        return {
          title: metadata.title,
          keywords: Array.isArray(metadata.keywords)
            ? metadata.keywords
            : metadata.keywords.split(',').map(k => k.trim()).filter(Boolean),
          abstract: metadata.abstract,
          script: content
        };
      }

      // 解析AI JSON响应
      const contentString = normalizedContent;
      const content = this._parseAIResponse(contentString);

      this.logger.info('Parsed content via _parseAIResponse', {
        hasTitle: !!content.title,
        hasKeywords: !!content.keywords,
        hasAbstract: !!content.abstract,
        title: content.title,
        keywords: content.keywords,
        scriptLength: content.script?.length || 0
      });

      return content;

    } catch (error) {
      this.logger.error('AI episode generation failed', {
        error: error.message,
        promptLength: prompt?.length,
        promptPreview: prompt?.substring(0, 200),
        topicTitle: topic?.title
      });
      throw new Error(`Failed to generate episode content: ${error.message}`);
    }
  }

  _extractContentText(content) {
    if (!content) return '';
    if (typeof content === 'string') {
      return content;
    }

    if (typeof content === 'object') {
      if (typeof content.content === 'string') {
        return content.content;
      }
      try {
        return JSON.stringify(content);
      } catch (error) {
        this.logger.warn('Failed to stringify content object for logging', {
          error: error.message
        });
        return '';
      }
    }

    return String(content);
  }

  /**
   * 解析AI响应（处理JSON）
   * @private
   */
  _parseAIResponse(responseText) {
    // 确保响应不为空
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('AI returned empty response');
    }

    this.logger.info('Parsing AI JSON response', {
      responseLength: responseText.length,
    containsJsonMarker: responseText.includes('```json'),
    containsTripleBackticks: responseText.includes('```'),
    startsWithBrace: responseText.trim().startsWith('{'),
    preview: responseText.substring(0, 300)
  });

    try {
    // 清理响应文本，移除可能的控制字符
    let cleanResponse = responseText
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // 移除控制字符
    .trim();

    // 提取JSON内容 - 按优先级尝试不同的格式
    let jsonText = null;

      // 1. 尝试提取```json代码块
    const jsonCodeBlock = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonCodeBlock) {
    jsonText = jsonCodeBlock[1].trim();
    } else {
      // 2. 尝试提取普通代码块
        const codeBlock = cleanResponse.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlock) {
          jsonText = codeBlock[1].trim();
        } else {
          // 3. 尝试提取JSON对象
          const jsonObject = cleanResponse.match(/\{[\s\S]*\}/);
          if (jsonObject) {
            jsonText = jsonObject[0].trim();
          }
        }
      }

      if (!jsonText) {
        throw new Error('No JSON found in AI response');
      }

      this.logger.debug('Extracted JSON text', {
        jsonLength: jsonText.length,
        jsonPreview: jsonText.substring(0, 200),
        startsWithBrace: jsonText.startsWith('{'),
        endsWithBrace: jsonText.endsWith('}')
      });

      const parsed = JSON.parse(jsonText);

  // 验证必需字段
  if (!parsed.title || !parsed.keywords || !parsed.abstract || !parsed.script) {
  throw new Error(`Missing required fields in JSON: title=${!!parsed.title}, keywords=${!!parsed.keywords}, abstract=${!!parsed.abstract}, script=${!!parsed.script}`);
  }

      // 验证内容质量
  const scriptLength = parsed.script.length;
  const keywordsArray = Array.isArray(parsed.keywords) ? parsed.keywords : parsed.keywords.split(',').map(k => k.trim()).filter(k => k);

  if (scriptLength < 200) {
  throw new Error(`Script too short: ${scriptLength} characters (minimum 200 required)`);
  }

    if (keywordsArray.length === 0) {
        throw new Error('No valid keywords found in response');
    }

      this.logger.info('Successfully parsed AI JSON response', {
    title: parsed.title,
  keywordsCount: keywordsArray.length,
  abstractLength: parsed.abstract.length,
        scriptLength: scriptLength
      });

  return {
        title: parsed.title,
      keywords: keywordsArray,
      abstract: parsed.abstract,
      script: parsed.script
  };

  } catch (error) {
  this.logger.error('Failed to parse AI JSON response', {
  error: error.message,
      errorType: error.constructor.name,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 500)
      });

      // 不再使用降级方案，直接抛出错误
      throw new Error(`AI response parsing failed: ${error.message}`);
    }
  }

  
}
