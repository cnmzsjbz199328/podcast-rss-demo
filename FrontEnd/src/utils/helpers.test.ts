import { describe, it, expect } from 'vitest'
import { formatDuration, formatFileSize, formatDate } from './helpers'

describe('helpers', () => {
  describe('formatDuration', () => {
    it('formats seconds correctly', () => {
      expect(formatDuration(65)).toBe('1:05')
      expect(formatDuration(3665)).toBe('1:01:05')
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB')
      expect(formatFileSize(0)).toBe('0 B')
    })
  })

  describe('formatDate', () => {
    it('formats date string', () => {
      const date = '2024-11-22T14:00:00Z'
      expect(formatDate(date)).toContain('2024年')
    })
  })
})
