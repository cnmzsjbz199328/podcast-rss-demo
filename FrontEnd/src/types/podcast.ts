export interface Episode {
  id: string
  title: string
  description: string
  script?: string
  audioUrl: string
  scriptUrl?: string
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
  data: {
    episode: Episode
  }
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
