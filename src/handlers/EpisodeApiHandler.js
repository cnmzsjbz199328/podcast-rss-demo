/**
 * 剧集API处理器 - 处理剧集相关的API请求
 */

import { Logger } from '../utils/logger.js';

export class EpisodeApiHandler {
  constructor() {
    this.logger = new Logger('EpisodeApiHandler');
  }

  /**
   * 处理剧集列表请求
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
            audioUrl: ep.audio_url,
            style: ep.style,
            duration: ep.duration,
            fileSize: ep.file_size,
            publishedAt: ep.published_at,
            createdAt: ep.created_at
          })),
          pagination: {
            limit,
            offset,
            total: stats.totalEpisodes || 0
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
        data: {
        id: episode.id,
        title: episode.title,
        description: episode.description,
        audioUrl: episode.audioUrl || episode.audio_url,
        srtUrl: episode.srtUrl || episode.srt_url,
        vttUrl: episode.vttUrl || episode.vtt_url,
        jsonUrl: episode.jsonUrl || episode.json_url,
        scriptUrl: episode.scriptUrl || episode.script_url,
        style: episode.style,
        duration: episode.duration,
        fileSize: episode.fileSize || episode.file_size,
        transcript: episode.transcript,
        metadata: episode.metadata,
        publishedAt: episode.publishedAt || episode.published_at,
        createdAt: episode.createdAt || episode.created_at,
        ttsEventId: episode.ttsEventId || episode.tts_event_id,
          ttsStatus: episode.ttsStatus || episode.tts_status,
          ttsError: episode.ttsError || episode.tts_error
        }
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
   * 处理音频轮询请求
   */
  async handlePollAudio(request, services, params) {
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

      this.logger.info('Polling audio for episode', { episodeId });

      // 获取剧集信息
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

      // 检查是否有event_id
      if (!episode.tts_event_id) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No TTS event ID found for this episode'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 如果已经完成，直接返回
      if (episode.tts_status === 'completed') {
        return new Response(JSON.stringify({
          success: true,
          status: 'completed',
          audioUrl: episode.audio_url
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 检查创建时间 - 建议至少等待 60 秒后再轮询
      const createdAt = new Date(episode.created_at);
      const now = new Date();
      const elapsedSeconds = Math.floor((now - createdAt) / 1000);
      
      this.logger.info('Checking elapsed time before polling', { 
        episodeId,
        createdAt: episode.created_at,
        elapsedSeconds 
      });
      
      // 如果创建时间不足 30 秒，建议等待
      if (elapsedSeconds < 30) {
        return new Response(JSON.stringify({
          success: true,
          status: 'processing',
          message: `Audio generation in progress. Please wait at least 60-90 seconds after generation before polling. Elapsed: ${elapsedSeconds}s`,
          estimatedWaitTime: Math.max(60 - elapsedSeconds, 0),
          createdAt: episode.created_at
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 轮询IndexTTS获取结果（一次性读取 SSE 流）
      this.logger.info('Polling IndexTTS for event_id', { 
        eventId: episode.tts_event_id,
        elapsedSeconds 
      });

      const pollResult = await services.voiceService.pollAudioResult(episode.tts_event_id);

      if (pollResult.status === 'completed') {
        // 上传音频到R2
        const audioKey = `audio/${new Date().toISOString().split('T')[0]}-${episode.style}-${Math.random().toString(36).substring(7)}.wav`;
        const uploadResult = await services.storageService.uploadFile(
          audioKey,
          pollResult.audioData,
          'audio/wav'
        );

        const audioUrl = `${services.storageService.baseUrl}/${audioKey}`;

        // 更新数据库
        await services.database.updateEpisodeAudio(episodeId, {
          audioUrl: audioUrl,
          audioKey: audioKey,
          fileSize: pollResult.fileSize,
          duration: episode.duration, // 保持原估算时长
          ttsStatus: 'completed'
        });

        return new Response(JSON.stringify({
          success: true,
          status: 'completed',
          audioUrl: audioUrl
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } else if (pollResult.status === 'processing') {
        return new Response(JSON.stringify({
          success: true,
          status: 'processing',
          message: pollResult.message || 'Audio generation still in progress'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // 更新数据库状态为失败
        await services.database.updateEpisodeAudio(episodeId, {
          ttsStatus: 'failed',
          ttsError: pollResult.error || 'Unknown polling error'
        });

        return new Response(JSON.stringify({
          success: false,
          status: 'failed',
          error: pollResult.error || 'Audio generation failed'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

    } catch (error) {
      this.logger.error('Audio polling failed', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Audio polling failed: ' + error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}
