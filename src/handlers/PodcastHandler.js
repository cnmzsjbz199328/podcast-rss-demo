/**
 * Podcast处理器 - 处理Podcast生成相关业务逻辑
 */

import { PodcastGenerator } from '../core/PodcastGenerator.js';
import { Logger } from '../utils/logger.js';

export class PodcastHandler {
  constructor() {
    this.logger = new Logger('PodcastHandler');
  }

  /**
  * 处理Podcast生成请求
  * @param {Request} request - 请求对象
  * @param {Object} services - 服务实例
  * @returns {Promise<Response>} 响应
  */
  async handleGenerate(request, services) {
  try {
  const url = new URL(request.url);
  const style = url.searchParams.get('style') || 'news-anchor';
  const useAsyncTts = url.searchParams.get('useAsyncTts') === 'true';

  this.logger.info('Starting podcast generation via IPodcastService', {
        style,
    useAsyncTts,
    url: request.url
  });

  // 使用新的业务服务
  const podcastService = services.newsPodcastService;

  let result;
  if (useAsyncTts) {
        result = await podcastService.generatePodcastAsync({ style });
  } else {
    result = await podcastService.generatePodcast({ style });
      }

  this.logger.info('Podcast generated successfully via IPodcastService', {
  episodeId: result.episodeId,
    status: result.status,
        useAsyncTts
  });

  return new Response(JSON.stringify({
    success: true,
        data: result
  }), {
  headers: {
    'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
  }
  });

  } catch (error) {
  this.logger.error('Podcast generation failed', {
        error: error.message,
      stack: error.stack,
    type: error.constructor.name
  });
  return new Response(JSON.stringify({
  success: false,
    error: `${error.message} (${error.constructor.name})`
  }), {
  status: 500,
  headers: {
      'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }
  });
  }
  }

  /**
   * 保存剧集到数据库 (已废弃 - 现在由 NewsPodcastService 处理)
   * @deprecated
   * @private
   * @param {Object} services - 服务实例
   * @param {Object} result - 生成结果
   * @param {string} style - 风格
   */
  async _saveEpisodeToDatabase(services, result, style) {
    try {
      const episodeData = {
        id: result.episodeId,
        title: result.title || `${style} - ${new Date().toLocaleDateString('en-US')}`,
        description: result.description || 'AI-generated news podcast',
        audioUrl: result.audioUrl || null,
        audioKey: result.audioUrl ? result.audioUrl.split('/').pop() : null,
        srtUrl: result.srtUrl || null,
        vttUrl: result.vttUrl || null,
        jsonUrl: result.jsonUrl || null,
        scriptUrl: result.scriptUrl,
        scriptKey: result.scriptUrl ? result.scriptUrl.split('/').pop() : null,
        duration: result.duration || 0,
        fileSize: result.fileSize || 0,
        style: style,
        transcript: result.metadata?.scriptMetadata?.script || '',
        status: 'published',
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ttsEventId: result.eventId || null, // 修复：使用result.eventId
        ttsStatus: result.isAsync ? 'pending' : 'completed', // 修复：根据isAsync判断状态
        ttsProvider: result.isAsync ? 'kokoro-streaming' : 'kokoro', // 设置TTS提供商
        metadata: {
          newsCount: result.newsCount || 0,
          wordCount: result.wordCount || 0,
          generatedAt: result.generatedAt || new Date().toISOString(),
          scriptMetadata: result.metadata?.scriptMetadata || {},
          voiceMetadata: result.metadata?.voiceMetadata || {},
          storageMetadata: result.metadata?.storageMetadata || {}
        }
      };

      this.logger.info('Saving episode to database', {
        episodeId: episodeData.id,
        ttsEventId: episodeData.ttsEventId,
        ttsStatus: episodeData.ttsStatus,
        isAsync: result.isAsync
      });

      const saved = await services.database.saveEpisode(episodeData);

      if (saved) {
        this.logger.info('Episode saved to database', { episodeId: episodeData.id });
      } else {
        this.logger.error('Episode save failed', { episodeId: episodeData.id });
      }
    } catch (error) {
      this.logger.error('Database save error', { episodeId: result.episodeId, error: error.message });
    }
  }
}
