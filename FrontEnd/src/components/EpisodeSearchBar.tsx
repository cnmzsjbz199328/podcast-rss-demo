import { useState, useCallback, useEffect } from 'react'
import { podcastApi } from '@/services/podcastApi'
import type { SearchedEpisode } from '@/types'

interface EpisodeSearchBarProps {
  /**
   * 搜索结果回调
   * @param results - 搜索到的剧集列表
   */
  onResults?: (results: SearchedEpisode[]) => void

  /**
   * 选中项回调
   * @param episode - 选中的剧集
   */
  onSelect?: (episode: SearchedEpisode) => void

  /**
   * 搜索框占位符
   */
  placeholder?: string

  /**
   * 额外的CSS类名
   */
  className?: string
}

/**
 * 剧集搜索栏组件
 *
 * 功能：
 * - 实时搜索（带防抖）
 * - 搜索title和description字段
 * - 搜索结果显示
 * - 清除搜索
 *
 * @example
 * <EpisodeSearchBar
 *   onResults={(results) => console.log(results)}
 *   onSelect={(episode) => navigate(`/episodes/${episode.id}`)}
 *   placeholder="搜索剧集"
 * />
 */
export const EpisodeSearchBar = ({
  onResults,
  onSelect,
  placeholder = '搜索新闻、主题或创作者',
  className = '',
}: EpisodeSearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchedEpisode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  // 实时搜索，带防抖
  useEffect(() => {
    // 空搜索词处理 - 不调用回调，保持搜索状态为 null
    if (!searchTerm.trim()) {
      setResults([])
      setError(null)
      return
    }

    setError(null)

    // 防抖延迟（300ms），避免频繁请求
    const timer = setTimeout(async () => {
      try {
        const response = await podcastApi.searchEpisodes(searchTerm, {
          limit: 20,
          offset: 0,
        })

        if (response.success) {
          setResults(response.data.episodes)
          onResults?.(response.data.episodes)
        } else {
          setError(response.error || 'Search failed')
          setResults([])
          onResults?.([])
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Search error'
        setError(errorMsg)
        setResults([])
        onResults?.([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, onResults])

  const handleClear = useCallback(() => {
    setSearchTerm('')
    setResults([])
    setError(null)
    // 不调用 onResults，让父组件恢复默认显示
  }, [onResults])

  const handleSelectEpisode = useCallback(
    (episode: SearchedEpisode) => {
      onSelect?.(episode)
      // 可选：选中后清除搜索
      // setSearchTerm('')
      // setResults([])
    },
    [onSelect]
  )

  return (
    <div className={`relative ${className}`}>
      {/* 搜索输入框 */}
      <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
        <span className="material-symbols-outlined text-secondary-text-dark">search</span>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="w-full flex-1 bg-transparent text-white placeholder-secondary-text-dark focus:outline-none"
          aria-label="Search episodes"
        />

        {/* 清除按钮 */}
        {searchTerm && (
          <button
            onClick={handleClear}
            className="text-secondary-text-dark hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* 搜索结果下拉框 */}
      {isFocused && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 rounded-lg shadow-lg max-h-96 overflow-y-auto z-10">
          {/* 错误提示 */}
          {error && <div className="px-4 py-3 text-red-400 text-sm">{error}</div>}

          {/* 搜索结果列表 */}
          {results.map((episode) => (
            <div
              key={episode.id}
              onClick={() => handleSelectEpisode(episode)}
              className="px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-white truncate">{episode.title}</div>
              {episode.description && (
                <div className="text-sm text-slate-400 truncate mt-1">
                  {episode.description.substring(0, 80)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
