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
  /**
   * 内容关键词/标签（数据库字段名：keywords）
   * @remarks
   * - 创建时：前端发送 tags[] 数组 → 后端转换为 keywords 逗号分隔字符串 → 数据库存储
   * - 获取时：后端返回 keywords 字符串 → 前端存储到 keywords 字段
   * - 显示时：可分割为数组显示，或直接显示
   */
  keywords?: string
  /**
   * @deprecated 已改为 keywords（数据库字段），此字段仅在创建请求时使用
   */
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
  /**
   * 内容关键词（对应数据库中的 keywords 字段）
   * @remarks
   * - 前端表单使用 tags[] 数组收集用户输入
   * - 提交时转换为 keywords 字符串（逗号分隔）
   * - 后端存储到数据库 keywords 字段
   * - 完全与数据库对齐
   * @example 'AI, 机器学习, 深度学习'
   */
  keywords?: string
  /**
   * @deprecated 内部使用tags[]收集用户输入，但提交时转换为keywords字符串发送
   */
  tags?: string[]
}

export interface CreateTopicResponse {
  success: boolean
  data: {
    /**
     * 新创建的主题ID
     * @remarks 后端返回的是 topicId，不是完整的 Topic 对象
     */
    topicId?: number
    /**
     * @deprecated 后端返回的实际上是 topicId，不是完整的 Topic 对象
     */
    topic?: Topic
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
    podcasts: {
      episodeId: string
      title: string
      createdAt: string
    }[]
    pagination: {
      limit: number
      offset: number
      total: number
    }
  }
}
