/**
 * API处理器 - 处理通用API请求
 */

import { Logger } from '../utils/logger.js';

export class ApiHandler {
  constructor() {
    this.logger = new Logger('ApiHandler');
  }

  /**
   * 处理剧集列表请求
   * @param {Request} request - 请求对象
   * @param {Object} services - 服务实例
   * @returns {Promise<Response>} 响应
   */
  async handleEpisodes(request, services) {
    try {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const style = url.searchParams.get('style');

      this.logger.info('Fetching episodes', { limit, offset, style });

      let episodes;
      if (style) {
        episodes = await services.database.getEpisodesByStyle(style, limit, offset);
      } else {
        episodes = await services.database.getPublishedEpisodes(limit, offset);
      }

      const stats = await services.database.getStatistics();

      const response = {
        success: true,
        data: {
          episodes: episodes.map(ep => ({
            id: ep.id,
            title: ep.title,
            description: ep.description,
            audioUrl: ep.audioUrl,
            style: ep.style,
            duration: ep.duration,
            fileSize: ep.fileSize,
            publishedAt: ep.publishedAt,
            createdAt: ep.createdAt
          })),
          pagination: {
            limit,
            offset,
            total: stats?.totalEpisodes || 0
          },
          stats
        }
      };

      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      this.logger.error('Episodes fetch failed', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch episodes'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 处理单个剧集详情请求
   * @param {Request} request - 请求对象
   * @param {Object} services - 服务实例
   * @param {Array} params - 路由参数
   * @returns {Promise<Response>} 响应
   */
  async handleEpisodeDetail(request, services, params) {
    try {
      const episodeId = params[0];

      if (!episodeId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Episode ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      this.logger.info('Fetching episode detail', { episodeId });

      const episode = await services.database.getEpisodeById(episodeId);

      if (!episode) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Episode not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: episode
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      this.logger.error('Episode detail fetch failed', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch episode detail'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 处理RSS Feed请求
   * @param {Request} request - 请求对象
   * @param {Object} services - 服务实例
   * @returns {Promise<Response>} 响应
   */
  async handleRssFeed(request, services) {
    try {
      this.logger.info('Generating RSS feed');

      const rssXml = await this._generateRssXml(services);

      return new Response(rssXml, {
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'max-age=300',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      this.logger.error('RSS feed generation failed', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  /**
   * 处理健康检查请求
   * @param {Request} request - 请求对象
   * @param {Object} services - 服务实例
   * @returns {Promise<Response>} 响应
   */
  async handleHealth(request, services) {
    try {
      this.logger.info('Health check requested');

      const stats = await services.database.getStatistics();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: stats ? 'healthy' : 'unhealthy',
          storage: 'healthy', // Assume healthy if we can serve this response
          totalEpisodes: stats?.totalEpisodes || 0,
          publishedEpisodes: stats?.publishedEpisodes || 0
        }
      };

      const isHealthy = Object.values(health.services).every(s =>
        typeof s === 'string' ? s === 'healthy' : true
      );

      return new Response(JSON.stringify(health), {
        status: isHealthy ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

    } catch (error) {
      this.logger.error('Health check failed', error);
      return new Response(JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 生成RSS XML
   * @private
   * @param {Object} services - 服务实例
   * @returns {Promise<string>} RSS XML字符串
   */
  async _generateRssXml(services) {
    const episodes = await services.database.getPublishedEpisodes(20, 0);

    const rssItems = episodes.map(ep => {
      const audioUrl = ep.audioUrl || '';
      const pubDate = new Date(ep.publishedAt || ep.createdAt).toUTCString();

      return `
    <item>
      <title><![CDATA[${ep.title}]]></title>
      <description><![CDATA[${ep.description}]]></description>
      <link>https://podcast-rss-demo.tj15982183241.workers.dev/episodes/${ep.id}</link>
      <guid>https://podcast-rss-demo.tj15982183241.workers.dev/episodes/${ep.id}</guid>
      <pubDate>${pubDate}</pubDate>
      ${audioUrl ? `<enclosure url="${audioUrl}" type="audio/mpeg" length="${ep.fileSize || 0}"/>` : ''}
      <itunes:duration>${Math.floor((ep.duration || 0) / 60)}:${((ep.duration || 0) % 60).toString().padStart(2, '0')}</itunes:duration>
    </item>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>AI新闻播客</title>
    <description>由AI生成的每日新闻播客</description>
    <link>https://podcast-rss-demo.tj15982183241.workers.dev</link>
    <language>zh-cn</language>
    <itunes:author>AI播客生成器</itunes:author>
    <itunes:image href="https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/public/1.png"/>
    ${rssItems}
  </channel>
</rss>`;
  }

  /**
   * 处理音频轮询请求
   * @param {Request} request - 请求对象
   * @param {Object} services - 服务实例
   * @param {Array} params - 路由参数 [episodeId]
   * @returns {Promise<Response>} 响应
   */
  async handlePollAudio(request, services, params) {
    try {
      const episodeId = params[0];
      this.logger.info('Polling audio for episode', { episodeId });

      const episode = await services.database.getEpisodeById(episodeId);

      if (!episode) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Episode not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!episode.ttsEventId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No TTS event ID found for this episode'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (episode.ttsStatus === 'completed') {
        return new Response(JSON.stringify({
          success: true,
          status: 'completed',
          audioUrl: episode.audioUrl
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 轮询IndexTTS
      this.logger.info('Polling IndexTTS', { eventId: episode.ttsEventId });
      const pollResult = await services.voiceService.pollAudioResult(episode.ttsEventId);

      if (pollResult.status === 'completed') {
        // 上传音频到R2
        const audioKey = `audio/${new Date().toISOString().split('T')[0]}-${episode.style}-${Math.random().toString(36).substring(7)}.wav`;
        await services.storageService.uploadFile(
          audioKey,
          pollResult.audioData,
          'audio/wav'
        );

        const audioUrl = `${services.storageService.baseUrl}/${audioKey}`;

        // 更新数据库
        await services.database.updateEpisodeAudio(episodeId, {
          audioUrl,
          audioKey,
          fileSize: pollResult.fileSize,
          duration: episode.duration,
          ttsStatus: 'completed'
        });

        this.logger.info('Audio poll completed', { episodeId, audioUrl });

        return new Response(JSON.stringify({
          success: true,
          status: 'completed',
          audioUrl,
          fileSize: pollResult.fileSize
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } else if (pollResult.status === 'failed') {
        await services.database.updateTtsStatus(episodeId, 'failed', pollResult.error);

        return new Response(JSON.stringify({
          success: false,
          status: 'failed',
          error: pollResult.error
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });

      } else {
        return new Response(JSON.stringify({
          success: true,
          status: 'processing',
          message: 'Audio generation still in progress'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

    } catch (error) {
      this.logger.error('Poll audio failed', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}
