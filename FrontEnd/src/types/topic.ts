export interface Topic {
  id: number
  title: string
  description?: string
  is_active: boolean
  generation_interval_hours: number
  episode_count: number
  created_at: string
  last_generated_at?: string
  category?: string
  tags?: string[]
  imageUrl?: string
}

export interface TopicStats {
  totalEpisodes: number
  totalDuration: number
  avgDuration: number
  totalWordCount: number
  avgWordCount: number
  recentEpisodes: {
    episodeNumber: number
    episodeId: string
    title: string
    keywords: string
    createdAt: string
  }[]
}

export interface TopicWithStats extends Topic {
  stats: TopicStats
}

export interface TopicListResponse {
  success: boolean
  data: {
    topics: TopicWithStats[]
    pagination: {
      limit: number
      offset: number
      total: number
    }
  }
}

export interface TopicDetailResponse {
  success: boolean
  data: {
    topic: Topic
    stats: TopicStats
  }
}

export interface CreateTopicRequest {
  title: string
  description?: string
  is_active?: boolean
  generation_interval_hours?: number
  category?: string
  tags?: string[]
}

export interface CreateTopicResponse {
  success: boolean
  data: {
    topic: Topic
  }
}

export interface GenerateTopicResponse {
  success: boolean
  data: {
    episodeId: string
    topicId: number
    title: string
    audioUrl: string
    scriptUrl: string
    duration: number
    createdAt: string
  }
}

export interface GenerateNextTopicResponse {
  success: boolean
  data: {
    episodeNumber: number
    episodeId: string
    topicId: number
    title: string
    keywords: string[]
    abstract: string
    audioUrl: string
    duration: number
    message: string
    previousKeywords: string[]
  }
}

export interface TopicPodcastsResponse {
  success: boolean
  data: {
    topicId: number
    topicTitle: string
    podcasts: {
      episodeId: string
      episodeNumber: number
      title: string
      keywords: string
      abstract: string
      audioUrl: string
      duration: number
      createdAt: string
    }[]
    total: number
  }
}
