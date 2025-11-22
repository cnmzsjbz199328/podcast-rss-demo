import { formatDuration, formatFileSize, formatDate } from './helpers'

export const episodeFormatters = {
  duration: formatDuration,
  fileSize: formatFileSize,
  publishedAt: formatDate,
  createdAt: formatDate,
}

export const topicFormatters = {
  createdAt: formatDate,
  lastGeneratedAt: (date?: string) => date ? formatDate(date) : '从未生成',
  episodeCount: (count: number) => `${count}集`,
}

export const statsFormatters = {
  totalEpisodes: (total: number) => `总共 ${total} 集`,
  totalDuration: (seconds: number) => `总时长 ${formatDuration(seconds)}`,
  avgDuration: (seconds: number) => `平均时长 ${formatDuration(seconds)}`,
  estimatedSize: (size: string) => `预计大小 ${size}`,
}
