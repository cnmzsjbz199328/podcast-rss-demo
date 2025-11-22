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
