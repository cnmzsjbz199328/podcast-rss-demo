import { apiRequest } from './api'
import type {
  TopicListResponse,
  TopicDetailResponse,
  CreateTopicRequest,
  CreateTopicResponse,
  GenerateTopicResponse,
  GenerateNextTopicResponse,
  TopicPodcastsResponse,
} from '@/types'

export const topicApi = {
  // 获取主题列表
  async getTopics(params?: {
    status?: 'active' | 'inactive'
    category?: string
    limit?: number
    offset?: number
  }): Promise<TopicListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())

    const query = searchParams.toString()
    return apiRequest<TopicListResponse>(`/topics${query ? `?${query}` : ''}`)
  },

  // 获取主题详情
  async getTopic(topicId: number): Promise<TopicDetailResponse> {
    return apiRequest<TopicDetailResponse>(`/topics/${topicId}`)
  },

  // 创建主题
  async createTopic(data: CreateTopicRequest): Promise<CreateTopicResponse> {
    return apiRequest<CreateTopicResponse>('/topics', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 更新主题
  async updateTopic(topicId: number, data: Partial<CreateTopicRequest>): Promise<CreateTopicResponse> {
    return apiRequest<CreateTopicResponse>(`/topics/${topicId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 删除主题
  async deleteTopic(topicId: number): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/topics/${topicId}`, {
      method: 'DELETE',
    })
  },

  // 生成主题播客（单集）
  async generateTopicPodcast(topicId: number, style: 'news-anchor' | 'topic-explainer' = 'topic-explainer'): Promise<GenerateTopicResponse> {
    return apiRequest<GenerateTopicResponse>(`/topics/${topicId}/generate?style=${style}`)
  },

  // 生成下一集（智能系列延续）
  async generateNextTopicEpisode(topicId: number, style: 'news-anchor' | 'topic-explainer' = 'topic-explainer'): Promise<GenerateNextTopicResponse> {
    return apiRequest<GenerateNextTopicResponse>(`/topics/${topicId}/generate-next?style=${style}`, {
      method: 'POST',
    })
  },

  // 获取主题播客列表
  async getTopicPodcasts(topicId: number): Promise<TopicPodcastsResponse> {
    return apiRequest<TopicPodcastsResponse>(`/topics/${topicId}/podcasts`)
  },

  // 轮询主题播客音频状态
  async pollTopicAudio(episodeId: string, eventId: string): Promise<{
    status: 'processing' | 'completed' | 'failed'
    message?: string
    progress?: number
    estimatedTime?: number
    audioUrl?: string
    duration?: number
    fileSize?: number
    error?: string
    retryable?: boolean
  }> {
    return apiRequest(`/topics/podcasts/${episodeId}/poll-audio?eventId=${eventId}`)
  },
}
