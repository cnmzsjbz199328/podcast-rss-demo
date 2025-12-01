export interface Episode {
  id: string
  title: string
  description: string
  script?: string
  audioUrl: string
  scriptUrl?: string
  transcriptUrl?: string
  subtitles?: {
    vtt: string
    srt: string
    json: string
  }
  style: 'news-anchor' | 'topic-explainer'
  duration: number
  wordCount: number
  fileSize: number
  publishedAt: string
  createdAt: string
  sourceUrl?: string
  keywords?: string[]
  topicId?: number
  episodeNumber?: number
  imageUrl?: string
  topicTitle?: string
}

export interface EpisodeListResponse {
  success: boolean
  data: {
    episodes: Episode[]
    pagination: {
      limit: number
      offset: number
      total: number
    }
    stats: {
      totalEpisodes: number
      publishedEpisodes: number
      processingEpisodes: number
    }
  }
}

export interface EpisodeDetailResponse {
  success: boolean
  data: Episode
}

export interface GenerateResponse {
  success: boolean
  episodeId: string
  title: string
  audioUrl: string
  scriptUrl: string
  subtitles: {
    vtt: string
    srt: string
    json: string
  }
  duration: number
  wordCount: number
  style: string
  createdAt: string
}

export interface AsyncGenerateResponse {
  success: boolean
  episodeId: string
  eventId: string
  message: string
  pollUrl: string
}

export interface PollAudioResponse {
  status: 'processing' | 'completed' | 'failed'
  message?: string
  progress?: number
  estimatedTime?: number
  audioUrl?: string
  duration?: number
  fileSize?: number
  error?: string
  retryable?: boolean
}

/**
 * 搜索结果中的剧集（精简版）
 */
export interface SearchedEpisode {
  id: string
  title: string
  description: string
}

/**
 * 剧集搜索响应
 */
export interface EpisodeSearchResponse {
  success: boolean
  data: {
    episodes: SearchedEpisode[]
    pagination: {
      limit: number
      offset: number
      total: number
    }
  }
  error?: string
}
