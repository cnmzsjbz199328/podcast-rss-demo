export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://podcasts.badtom.dpdns.org'

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

/**
 * Topic 字段映射关系说明
 * 
 * 前后端数据流（完全对齐）：
 * 
 * Frontend Form Input:
 *   tags (string[]) - 用户输入的标签数组
 *   ↓ 用户填表单
 * Frontend Submit:
 *   keywords (string) - 前端转换：tags.join(', ')
 *   ↓ 发送到后端
 * Backend Receives:
 *   keywords (string) - 逗号分隔的字符串
 *   ↓ 直接存储（无需转换）
 * Database Storage:
 *   keywords (TEXT) - 存储到数据库
 *   ↓ 查询时返回
 * Frontend Display:
 *   keywords (string) - 后端返回的字符串
 *   ↓ 前端分割显示
 *   tags (string[]) - 分割为数组显示
 * 
 * 设计优势：
 * - 前端与数据库完全对齐，无歧义
 * - 表单内部使用tags数组，提高用户体验
 * - 提交时转换为keywords字符串，与DB对齐
 * - 显示时再次分割为数组，保证一致性
 */
export const TOPIC_FIELD_MAPPING = {
  FORM_INPUT: 'tags (array)',
  FORM_LABEL: '内容标签',
  API_REQUEST: 'keywords (string)',
  DATABASE_NAME: 'keywords',
  DATABASE_FORMAT: 'comma-separated string (e.g., "AI, 机器学习")',
} as const

/**
 * 默认封面图片库
 * 当API返回的episode没有imageUrl时，随机选择一个作为默认封面
 */
export const DEFAULT_COVER_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA2_9ObCfONvijhgVOs3in0B-EprZvvBQj8HmEo8C3ZrvHV13F7vylFUM1SN-SJH8FHZ1uLR1f0BL9PBJ71q8Le0dAEE0PKnBaMWZuvrzAYfpx9gsm0e87SJlE0NWzLgLGDL7NneGYtXMmTbnJ_vtZJ5PU7GtCsQtYba8dKC6fOrkRqxXzm5Y9DnIAS5qWU6R37P9PIy0YFmpAmSpfXq6HDduSTnYNEs4nq4eG1bUKANHo3kZ-wEjtaGTbllMRrHYU1FTRG-pEoJIA',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDcHG_Au_PUVs_1XYLxCMjUhkQ2_u8_urrxrGpNvW5LHsVIDo__TYMTN5pDc715XAf9eCI9HRAytpIV6TwvyEY4Usyz_p2xAbcrrs3-VJqyKJu0nU53mxxeKvJfEDvkUWiGDK3zn8mws2tY-rDyV9rqk-UGsfUEY0bzM50W4AipzzdgH1M3PAzlD_7tXcuRGbTzKZJJpS7dxxX5vNSPlQ06tHYADp8H41fBwF2vxubmfM7G4kXk1HE-ewfSUZr7tmDp1ViH0lMdsvE',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDosL342eUaaDpFKSGV-rfetq5Al0gMjZo2a5mE-wHUDiIg7cM4h40I490Onedky92e8q1DQ4YDZM3JWBgL9Vd8XbiLDXX_JUMeGjDIL-wQnXirgP5Tlq_ktVz71tjGCOF5v8cuR4JvOlgHyN8atBKM2YW5P0dxpIp72hnHgaflwut5EaItjLUblFUeu9_1R1dKfoe_m253yz1Q76WEPFmtsn_AR80FegpBDUOv9SpaJOxDgmvLHxfguYRc-idSfD5iBeE3bUtNA7E',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB7_gVRC3I1E7bAzT4Vl0dfnXHCu-Gi_mrwvpJKx4IVW8zD3-54Vwfu_ktoHOssoYfnJELuTaaAOUC1fKV3CR1YI-NYNQhReu8k3XHpzQexURQiwUCHnxdXFKB4WTqyPb8mJRA6q8S9rYGscJDCm-8RvqcAX4eb1-yo7mVoBYFDXVUp8bDFDAwHBimufalKXut7tQvF10jNg9ae2NNTGWZTrRXb7ImpQS6eJh2SWwaVahb4rp16NuubaIWcf49_pQYXPZlIyqfsJGs',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAkl3PreaggYG8URlqwWv9mVKjHHbRGY3uDttIOAAy7ElJ4h1VfRbZa29k5LVjyZfGf-MaxDAb6ZWuYGc7aMbVha5SHBOU515M6eevzM_lBPKzY6oxfYm6RBX6Sfgd-PlH5GnGxjGKfTTRY9yHq5DNuMG6QK_o2xeU2LjycOzlwCy_EMFYchbIateVGNWQ7ujAa1hpGkkHMWck3lekIZEuSZio42XNbOOImO6JXttRmbzBGG9aPt16ZBTxMfXFdBCZa6AIdwj1i5vg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAaH0QTLQ51mDGrlz5e1jPZkxvbS8HBFpfrX6rjl2mioAOBkLokcwaA0fO3jBxDGS13Y5hhXf2EYlkUY640uULiGIqAg4VDCukjjocuxB1PHkcLOPdD6U2ypBFCe-AY1xxoQW3qg4WnqT32Dz2qyxpY5PHlDFJVO_iywyqq_gcz7Ru3cHZEHDoVyLVW0lFpLKjjEVyGGxuI7Mbc4Ko4BQ9rx2a23QPwyHAKS_P1sG9HIPz2v9nJQFSIshO1SlL97Wahq0-csmrABcM',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCrc9PbDj18YaIJRHf9_6e_h9-bASYEu73yqUmPOvSdgLQ2LDIJHJHWCCIbfaKq9x-Iz86ixNCKFJ-jrMhzD5NPUlFOe1aRvcKwOHPQdwmFuTx_QGTLgL-x2IZK63iAi6MtqEYFEuF6f9L9sgIJs9jMRPJrIj3qNCL2ITS5G4bS4a2raWelt_zyBqYGODyFj0elyp30Z6lsuLr_m_awNg6dETHyP18iXBmj7kuRsME1Pa-wvHBU8uvRT68_QBjSW35jhmiAsyrlRWk',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCWFLCVnwtgPh9wuVlIRf_0skOLwGt6Fl1PF0YUZ2J3EpaSIuLo4fi_nbsAwb8YquNytRd0Wi24WTlMULHez850Tyfb7gCAvkS1NRQLqEZ_-7IIgOfK8f4elW96-Em7eQS4jW_OIVDj4jq-G4P4ZuyQx9w4T5wqRxuwx8CaMAvzpKK48jQSyxaEK5Jz6QCy4-4BhOPhxv7bZLwv5D-tMPygf3WC9eV2xQO6D-z3LYb9OJsKpmUsDeTZr5JfEFHATR8uz3mkLpCFYk4',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCKLXaT7NThEUP9efnII5OxAzcAJXs0TyIizT7te2IYY5Ha_qlx8RTBEf83P8Wepv1DZetv1nsEFzwVNX_7IDGox2YLV5boBduvH8HjkSFzdtcLaUOLVxOAymT9vf0v8RW012WZ0yAD4_BYoh3Dgzymz_4sc_ZG7Jk-hXyUKS9NYBvmAbadf-ApA5YRbU8WZi1tdm8f9Q3PdBmegfGKNj-c8JRHNVx43mYPVcINexv-C1PXzO9SW7fwmhmlOLj3T4CAu52qfb5mJMo',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBLLimdLg5EGtNuZglsvyjmPPCFWXf1d1SwzaWk9ODNxbKt3wC9vTSSknitAgeW6r6EDXuKfHNdIkjQvgfJ9g8Aw7QABhjOCOu8743xXTX13oX63cb_cNad7GmMgyY2A7A1QNYqu2TRiS3bZEnJp_3tFzONPI3Km-F70PFOGz2870zFBNLHERTjMPGA7QmgguPd-zuaxaEmlbyYwEeaFqVNHj_9enZrR7FA6w3A8DKx29bx5T3IGL-fm4gvGQpvTVMb3w2g26c2C0g',
] as const
