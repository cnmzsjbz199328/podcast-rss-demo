/**
 * 主题播客辅助类
 * 处理主题播客相关的辅助功能
 */
export class TopicPodcastHelper {
  /**
   * 生成唯一的剧集ID
   * @param {number} topicId - 主题ID
   * @returns {string} 剧集ID
   */
  static generateEpisodeId(topicId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `topic-${topicId}-${timestamp}-${random}`;
  }

  /**
   * 处理主题数据，转换为适合脚本生成的格式
   * @param {Object} topicData - 主题数据 { topic, content }
   * @returns {Array} 格式化的新闻数据数组
   */
  static processTopicData(topicData) {
    const { topic, content } = topicData;

    // 将主题数据转换为类似新闻的格式
    return [{
      title: topic.title,
      description: topic.description,
      keywords: topic.keywords,
      category: topic.category,
      content: content || topic.description,
      source: 'topic-based'
    }];
  }

  /**
   * 格式化播客结果
   * @param {Object} workflowResults - 工作流结果
   * @param {string} episodeId - 剧集ID
   * @param {number} topicId - 主题ID
   * @param {boolean} isAsync - 是否异步
   * @returns {Object} 格式化的结果
   */
  static formatPodcastResult(workflowResults, episodeId, topicId, isAsync = false) {
    if (isAsync) {
      return {
        episodeId,
        status: 'processing',
        ttsEventId: workflowResults.initiateAudio?.eventId,
        topicId
      };
    }

    return {
      episodeId,
      status: 'completed',
      audioUrl: workflowResults.storeFiles?.audioUrl,
      duration: workflowResults.generateAudio?.duration,
      transcript: workflowResults.generateScript?.content,
      createdAt: new Date().toISOString(),
      topicId
    };
  }

  /**
   * 格式化播客列表
   * @param {Array} topicPodcasts - 原始主题播客数据（来自视图v_topic_podcasts）
   * @returns {Array} 格式化的播客信息
   */
  static formatPodcastList(topicPodcasts) {
    if (!topicPodcasts || !Array.isArray(topicPodcasts)) {
      return [];
    }

    return topicPodcasts.map(podcast => ({
      episodeId: podcast.episode_id,
      title: podcast.title || `Episode ${podcast.id}`,
      description: podcast.description,
      status: podcast.status,
      audioUrl: podcast.audio_url,
      duration: podcast.duration,
      createdAt: podcast.created_at,
      updatedAt: podcast.updated_at,
      metadata: {
        topicId: podcast.topic_id,
        episodeNumber: podcast.id, // 使用主键作为episode number
        topicTitle: podcast.topic_title,
        topicCategory: podcast.topic_category
      }
    }));
  }

  /**
   * 格式化单个播客详情
   * @param {Object} podcast - 原始播客数据（来自视图v_topic_podcasts）
   * @returns {Object} 格式化的播客详情
   */
  static formatPodcastDetail(podcast) {
    if (!podcast) {
      return null;
    }

    return {
      episodeId: podcast.episode_id,
      title: podcast.title || `Episode ${podcast.id}`,
      description: podcast.description,
      status: podcast.status,
      audioUrl: podcast.audio_url,
      duration: podcast.duration,
      createdAt: podcast.created_at,
      updatedAt: podcast.updated_at,
      metadata: {
        topicId: podcast.topic_id,
        episodeNumber: podcast.id, // 使用主键作为episode number
        topicTitle: podcast.topic_title,
        topicCategory: podcast.topic_category
      }
    };
  }
}

/**
 * 主题播客轮询助手
 * 处理主题播客异步生成的轮询逻辑
 */
export class TopicPodcastPollHelper {
  constructor(services, topicPodcastRepository) {
    this.services = services;
    this.topicPodcastRepository = topicPodcastRepository;
  }

  /**
   * 处理轮询请求
   * @param {string} episodeId - 剧集ID
   * @returns {Promise<Object>} 轮询结果
   */
  async pollGeneration(episodeId) {
    const topicPodcast = await this.topicPodcastRepository.getById(episodeId);

    if (!topicPodcast) {
      throw new Error(`Topic podcast not found: ${episodeId}`);
    }

    // 检查是否已完成
    if (topicPodcast.status === 'completed') {
      return {
        status: 'completed',
        podcast: TopicPodcastHelper.formatPodcastDetail(topicPodcast)
      };
    }

    // 检查是否为异步生成
    if (!topicPodcast.tts_event_id) {
      return {
        status: 'unknown',
        error: 'No TTS event ID found for this podcast'
      };
    }

    // 轮询 TTS 状态
    const audioStatus = await this.services.asyncVoiceService.pollAudioStatus(
      topicPodcast.tts_event_id
    );

    if (audioStatus.status === 'completed') {
      // 更新数据库
      await this.topicPodcastRepository.update(episodeId, {
        audioUrl: audioStatus.audioUrl,
        duration: audioStatus.duration,
        status: 'completed'
      });

      return {
        status: 'completed',
        podcast: {
          episodeId: topicPodcast.episode_id,
          title: topicPodcast.title || `Episode ${topicPodcast.episode_number}`,
          description: topicPodcast.description,
          status: 'completed',
          audioUrl: audioStatus.audioUrl,
          duration: audioStatus.duration,
          createdAt: topicPodcast.created_at,
          updatedAt: new Date().toISOString(),
          metadata: {
            topicId: topicPodcast.topic_id,
            episodeNumber: topicPodcast.episode_number,
            topicTitle: topicPodcast.topic_title
          }
        }
      };

    } else if (audioStatus.status === 'failed') {
      // 更新数据库失败状态
      await this.topicPodcastRepository.update(episodeId, {
        status: 'failed'
      });

      return {
        status: 'failed',
        error: audioStatus.error
      };
    }

    // 仍在处理中
    return {
      status: audioStatus.status,
      podcast: {
        episodeId: topicPodcast.episode_id,
        title: topicPodcast.title || `Episode ${topicPodcast.episode_number}`,
        description: topicPodcast.description,
        status: 'processing',
        createdAt: topicPodcast.created_at,
        metadata: {
          topicId: topicPodcast.topic_id,
          episodeNumber: topicPodcast.episode_number,
          topicTitle: topicPodcast.topic_title
        }
      }
    };
  }
}

/**
 * 主题内容服务适配器
 * 将主题数据适配为RSS服务接口
 */
export class TopicContentServiceAdapter {
  constructor(topic) {
    this.topic = topic;
  }

  /**
   * 模拟RSS服务的fetchNews方法
   * @returns {Promise<Array>} 主题内容数组
   */
  async fetchNews() {
    // 返回主题内容而非RSS
    return [{
      title: this.topic.title,
      description: this.topic.description,
      keywords: this.topic.keywords,
      category: this.topic.category
    }];
  }
}

/**
 * 主题脚本服务适配器
 * 将主题脚本生成适配为标准脚本服务接口
 */
export class TopicScriptServiceAdapter {
  constructor(baseScriptService, topic) {
    this.baseScriptService = baseScriptService;
    this.topic = topic;
  }

  /**
   * 生成脚本（适配主题内容）
   * @param {Array} content - 内容数组
   * @param {string} style - 脚本风格
   * @returns {Promise<Object>} 生成的脚本结果
   */
  async generateScript(content, style) {
    // 转换为 contentData 格式
    const contentData = {
      type: 'topic',
      data: {
        topic: this.topic,
        content
      }
    };

    return await this.baseScriptService.generateScript(contentData, style);
  }
}
