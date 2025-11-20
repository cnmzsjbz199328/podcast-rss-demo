/**
 * 新闻播客辅助类
 * 处理新闻播客相关的辅助功能
 */
export class NewsPodcastHelper {
  /**
   * 生成唯一的剧集ID
   * @returns {string} 剧集ID
   */
  static generateEpisodeId() {
    return `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 格式化播客结果
   * @param {Object} workflowResults - 工作流结果
   * @param {string} episodeId - 剧集ID
   * @param {boolean} isAsync - 是否异步
   * @returns {Object} 格式化的结果
   */
  static formatPodcastResult(workflowResults, episodeId, isAsync = false) {
    if (isAsync) {
      return {
        episodeId,
        status: 'processing',
        ttsEventId: workflowResults.initiateAudio?.eventId
      };
    }

    return {
      episodeId,
      status: 'completed',
      audioUrl: workflowResults.storeFiles?.audioUrl,
      duration: workflowResults.generateAudio?.duration,
      transcript: workflowResults.generateScript?.content,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 格式化播客信息列表
   * @param {Array} episodes - 原始剧集数据（已由EpisodeRepository映射为camelCase）
   * @returns {Array} 格式化的播客信息
   */
  static formatPodcastList(episodes) {
    if (!episodes || !Array.isArray(episodes)) {
      return [];
    }

    return episodes.map(episode => ({
      episodeId: episode.id,
      title: episode.title,
      description: episode.description,
      status: episode.status,
      audioUrl: episode.audioUrl || episode.audio_url,
      duration: episode.duration,
      createdAt: episode.createdAt || episode.created_at,
      publishedAt: episode.publishedAt || episode.published_at,
      metadata: episode.metadata || null
    }));
  }

  /**
   * 格式化单个播客详情
   * @param {Object} episode - 原始剧集数据（已由EpisodeRepository映射为camelCase）
   * @returns {Object} 格式化的播客详情
   */
  static formatPodcastDetail(episode) {
    if (!episode) {
      return null;
    }

    return {
      episodeId: episode.id,
      title: episode.title,
      description: episode.description,
      status: episode.status,
      audioUrl: episode.audioUrl || episode.audio_url,
      duration: episode.duration,
      createdAt: episode.createdAt || episode.created_at,
      publishedAt: episode.publishedAt || episode.published_at,
      metadata: episode.metadata || null
    };
  }
}

/**
 * 新闻播客轮询助手
 * 处理异步生成的轮询逻辑
 */
export class NewsPodcastPollHelper {
  constructor(services) {
    this.services = services;
  }

  /**
   * 处理轮询请求
   * @param {string} episodeId - 剧集ID
   * @returns {Promise<Object>} 轮询结果
   */
  async pollGeneration(episodeId) {
    const episode = await this.services.database.getEpisode(episodeId);

    if (!episode) {
      throw new Error(`News podcast not found: ${episodeId}`);
    }

    // 检查是否为异步生成
    if (!episode.tts_event_id) {
      // 同步生成已完成
      return {
        status: 'completed',
        podcast: NewsPodcastHelper.formatPodcastDetail(episode)
      };
    }

    // 轮询 TTS 状态
    const audioStatus = await this.services.asyncVoiceService.pollAudioStatus(
      episode.tts_event_id
    );

    if (audioStatus.status === 'completed') {
      // 更新数据库
      await this.services.database.updateEpisodeAudio(episodeId, {
        audioUrl: audioStatus.audioUrl,
        duration: audioStatus.duration,
        ttsStatus: 'completed'
      });

      return {
        status: 'completed',
        podcast: {
          episodeId: episode.id,
          title: episode.title,
          description: episode.description,
          status: 'published',
          audioUrl: audioStatus.audioUrl,
          duration: audioStatus.duration,
          createdAt: episode.created_at,
          publishedAt: new Date().toISOString()
        }
      };

    } else if (audioStatus.status === 'failed') {
      // 更新数据库失败状态
      await this.services.database.updateEpisodeAudio(episodeId, {
        ttsStatus: 'failed',
        error: audioStatus.error
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
        episodeId: episode.id,
        title: episode.title,
        description: episode.description,
        status: 'processing',
        createdAt: episode.created_at
      }
    };
  }
}
