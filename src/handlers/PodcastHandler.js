/**
 * 播客处理器 - 处理播客生成相关业务逻辑
 */

import { PodcastGenerator } from '../core/PodcastGenerator.js';
import { Logger } from '../utils/logger.js';

export class PodcastHandler {
  constructor() {
    this.logger = new Logger('PodcastHandler');
  }

  /**
   * 处理播客生成请求
   * @param {Request} request - 请求对象
   * @param {Object} services - 服务实例
   * @returns {Promise<Response>} 响应
   */
  async handleGenerate(request, services) {
    try {
      const url = new URL(request.url);
      const style = url.searchParams.get('style') || 'news-anchor';

      this.logger.info('Starting podcast generation', { style });

      // 创建生成器实例
      const config = {
        services: {
          rss: { url: 'https://feeds.bbci.co.uk/news/rss.xml' },
          script: { apiKey: 'dummy' }, // Will be overridden by service
          voice: { endpoint: 'Tom1986/indextts2' },
          storage: { bucket: 'podcast-files' }
        }
      };

      const generator = new PodcastGenerator(services, config);
      const result = await generator.generatePodcast(style);

      this.logger.info('Podcast generated successfully', {
        episodeId: result.episodeId,
        title: result.title
      });

      // 保存到数据库
      if (result.episodeId) {
        await this._saveEpisodeToDatabase(services, result, style);
      }

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
      this.logger.error('Podcast generation failed', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
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
   * 保存剧集到数据库
   * @private
   * @param {Object} services - 服务实例
   * @param {Object} result - 生成结果
   * @param {string} style - 风格
   */
  async _saveEpisodeToDatabase(services, result, style) {
    try {
      const episodeData = {
        id: result.episodeId,
        title: result.title || `${style} - ${new Date().toLocaleDateString('zh-CN')}`,
        description: result.description || '由AI生成的新闻播客',
        audioUrl: result.audioUrl || null,
        audioKey: result.audioUrl ? result.audioUrl.split('/').pop() : null,
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
