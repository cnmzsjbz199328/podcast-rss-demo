export const API_BASE_URL = 'https://podcast-rss-demo.tj15982183241.workers.dev'

export const PODCAST_STYLES = {
  NEWS_ANCHOR: 'news-anchor',
  TOPIC_EXPLAINER: 'topic-explainer',
} as const

export const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  OFFSET: 0,
} as const

export const POLLING_INTERVAL = 5000 // 5 seconds
export const MAX_POLL_ATTEMPTS = 60 // 5 minutes max

export const AUDIO_FORMATS = {
  MP3: 'audio/mpeg',
  WAV: 'audio/wav',
} as const

export const SUBTITLE_FORMATS = {
  VTT: 'vtt',
  SRT: 'srt',
  JSON: 'json',
} as const

/**
 * 主题播客分类选项
 * 对应后端 topics.category 字段
 */
export const TOPIC_CATEGORIES = {
  TECHNOLOGY: { value: 'technology', label: 'technology' },
  SCIENCE: { value: 'science', label: 'science' },
  BUSINESS: { value: 'business', label: 'business' },
  EDUCATION: { value: 'education', label: 'education' },
  LIFESTYLE: { value: 'lifestyle', label: 'lifestyle' },
  GENERAL: { value: 'general', label: 'general' },
} as const

export const CATEGORY_OPTIONS = Object.values(TOPIC_CATEGORIES)

/** 默认生成间隔（小时） */
export const DEFAULT_GENERATION_INTERVAL_HOURS = 24;

/**
 * 表单验证规则
 */
export const FORM_VALIDATION = {
  TITLE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MAX_LENGTH: 1000,
  },
  TAGS: {
    MAX_COUNT: 5,
    MAX_LENGTH: 20,
  },
  GENERATION_INTERVAL: {
    MIN: 1,
    MAX: 720, // 30 days
  },
} as const
