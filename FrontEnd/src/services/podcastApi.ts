import { apiRequest } from './api'
import type {
  Episode,
  EpisodeListResponse,
  EpisodeDetailResponse,
  GenerateResponse,
  AsyncGenerateResponse,
  PollAudioResponse,
} from '@/types'

const normalizeEpisode = (episode: Episode): Episode => ({
  ...episode,
  scriptUrl: episode.scriptUrl ?? episode.transcriptUrl ?? undefined,
})

export const podcastApi = {
  // 获取播客列表
  async getEpisodes(params?: {
    limit?: number
    offset?: number
    style?: 'news-anchor' | 'topic-explainer'
  }): Promise<EpisodeListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    if (params?.style) searchParams.set('style', params.style)

    const query = searchParams.toString()
    const response = await apiRequest<EpisodeListResponse>(`/episodes${query ? `?${query}` : ''}`)

    return {
      ...response,
      data: {
        ...response.data,
        episodes: response.data.episodes.map(normalizeEpisode),
      },
    }
  },

  // 获取单个播客详情
  async getEpisode(episodeId: string): Promise<EpisodeDetailResponse> {
    const response = await apiRequest<EpisodeDetailResponse>(`/episodes/${episodeId}`)

    return {
      ...response,
      data: normalizeEpisode(response.data),
    }
  },

  // 生成News播客（同步）
  async generateNews(style: 'news-anchor' | 'topic-explainer' = 'news-anchor'): Promise<GenerateResponse> {
    return apiRequest<GenerateResponse>(`/generate?style=${style}`)
  },

  // 生成News播客（异步）
  async generateNewsAsync(style: 'news-anchor' | 'topic-explainer' = 'news-anchor'): Promise<AsyncGenerateResponse> {
    return apiRequest<AsyncGenerateResponse>(`/generate?style=${style}&useAsyncTts=true`, {
      method: 'POST',
    })
  },

  // 轮询音频生成状态
  async pollAudio(episodeId: string, eventId: string): Promise<PollAudioResponse> {
    return apiRequest<PollAudioResponse>(`/episodes/${episodeId}/poll-audio?eventId=${eventId}`)
  },

  // 获取字幕
  async getSubtitles(episodeId: string, format: 'vtt' | 'srt' | 'json' = 'vtt'): Promise<{ url: string } | null> {
    try {
      const response = await apiRequest<{ success: boolean; data?: { srtUrl?: string; vttUrl?: string; jsonUrl?: string } }>(
        `/episodes/${episodeId}/subtitles?format=${format}`
      );
      
      if (response.success && response.data) {
        const urlKey = format === 'srt' ? 'srtUrl' : format === 'json' ? 'jsonUrl' : 'vttUrl';
        const url = response.data[urlKey as keyof typeof response.data];
        if (url) return { url: url as string };
      }
    } catch {
      // 字幕可能不存在，静默失败
    }
    return null;
  },
}
