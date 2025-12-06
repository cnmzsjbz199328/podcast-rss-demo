import { POLLING_INTERVAL, MAX_POLL_ATTEMPTS, DEFAULT_COVER_IMAGES } from './constants'

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}/${month}/${day} ${hour}:${minute}`
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function pollWithTimeout<T>(
  pollFn: () => Promise<T>,
  conditionFn: (result: T) => boolean,
  interval = POLLING_INTERVAL,
  maxAttempts = MAX_POLL_ATTEMPTS
): Promise<T> {
  let attempts = 0

  while (attempts < maxAttempts) {
    const result = await pollFn()
    if (conditionFn(result)) {
      return result
    }
    await sleep(interval)
    attempts++
  }

  throw new Error('Polling timeout exceeded')
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 获取随机封面图片
 * @param seed 用于生成确定性随机数的种子（如episode.id），默认使用真随机
 * @returns 返回DEFAULT_COVER_IMAGES中的一个
 */
export function getRandomCoverImage(seed?: string | number): string {
  if (seed !== undefined) {
    // 基于种子生成确定性随机数
    const hash = String(seed).split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0)
    const index = Math.abs(hash) % DEFAULT_COVER_IMAGES.length
    return DEFAULT_COVER_IMAGES[index]
  }
  
  // 真随机
  return DEFAULT_COVER_IMAGES[Math.floor(Math.random() * DEFAULT_COVER_IMAGES.length)]
}
