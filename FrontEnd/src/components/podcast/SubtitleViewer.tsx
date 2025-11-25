import { useState, useEffect } from 'react';
import './SubtitleViewer.css';

interface SubtitleLine {
  startTime: number;
  endTime: number;
  text: string;
}

interface SubtitleViewerProps {
  subtitleUrl?: string;
  format?: 'vtt' | 'srt' | 'json';
  currentTime: number;
  onSeek?: (time: number) => void;
}

export const SubtitleViewer = ({
  subtitleUrl,
  format = 'vtt',
  currentTime,
  onSeek,
}: SubtitleViewerProps) => {
  const [subtitles, setSubtitles] = useState<SubtitleLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // 解析VTT格式
  const parseVTT = (content: string): SubtitleLine[] => {
    const lines = content.split('\n');
    const subtitles: SubtitleLine[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // 寻找时间码行
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->').map((s) => s.trim());
        const startTime = parseTime(startStr);
        const endTime = parseTime(endStr);

        // 获取文本内容（可能跨多行）
        let text = '';
        i++;
        while (i < lines.length && lines[i].trim() !== '') {
          text += (text ? ' ' : '') + lines[i].trim();
          i++;
        }

        if (text) {
          subtitles.push({ startTime, endTime, text });
        }
      }
      i++;
    }

    return subtitles;
  };

  // 解析SRT格式
  const parseSRT = (content: string): SubtitleLine[] => {
    // SRT格式基本上就是VTT格式，只是没有WEBVTT头
    const cleaned = content.replace(/^\d+\n/gm, ''); // 移除序号
    return parseVTT(cleaned);
  };

  // 解析JSON格式
  const parseJSON = (content: string): SubtitleLine[] => {
    try {
      const data = JSON.parse(content) as unknown;
      if (Array.isArray(data)) {
        return data.map((item) => {
          const itemObj = item as Record<string, unknown>;
          return {
            startTime: typeof itemObj.start === 'number' ? itemObj.start : parseTime(String(itemObj.start || '')),
            endTime: typeof itemObj.end === 'number' ? itemObj.end : parseTime(String(itemObj.end || '')),
            text: String(itemObj.text || itemObj.content || ''),
          };
        });
      }
      return [];
    } catch {
      return [];
    }
  };

  // 时间字符串转秒数 (HH:MM:SS,mmm 或 HH:MM:SS.mmm)
  const parseTime = (timeStr: string): number => {
    const match = timeStr.match(/(\d+):(\d+):(\d+)[.,](\d+)/);
    if (!match) return 0;
    const [, h, m, s, ms] = match;
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
  };

  // 获取字幕文件
  useEffect(() => {
    if (!subtitleUrl) return;

    const fetchSubtitles = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(subtitleUrl);
        if (!response.ok) throw new Error('Failed to fetch subtitles');

        const content = await response.text();

        // 根据格式解析
        let parsed: SubtitleLine[] = [];
        if (format === 'json') {
          parsed = parseJSON(content);
        } else if (format === 'srt') {
          parsed = parseSRT(content);
        } else {
          // VTT格式
          parsed = parseVTT(content);
        }

        setSubtitles(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subtitles');
        setSubtitles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubtitles();
  }, [subtitleUrl, format]);

  // 根据当前时间找到对应的字幕
  useEffect(() => {
    const index = subtitles.findIndex(
      (sub) => currentTime >= sub.startTime && currentTime < sub.endTime
    );
    setCurrentIndex(index);
  }, [currentTime, subtitles]);

  if (!subtitleUrl) {
    return null;
  }

  if (loading) {
    return (
      <div className="subtitle-viewer">
        <div className="subtitle-loading">
          <p className="text-slate-400">加载字幕中...</p>
        </div>
      </div>
    );
  }

  if (error || subtitles.length === 0) {
    return error ? (
      <div className="subtitle-viewer">
        <div className="subtitle-error">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    ) : null;
  }

  return (
    <div className="subtitle-viewer">
      {currentIndex >= 0 && subtitles[currentIndex] && (
        <div className="subtitle-container">
          <div className="subtitle-text">
            {subtitles[currentIndex].text}
          </div>
          <button
            onClick={() => onSeek?.(subtitles[currentIndex].startTime)}
            className="subtitle-seek-btn"
            title="点击跳转到此字幕"
          >
            <span className="material-symbols-outlined text-sm">skip_next</span>
          </button>
        </div>
      )}

      {/* 字幕轨道列表 */}
      <div className="subtitle-track">
        {subtitles.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((sub, idx) => (
          <button
            key={idx}
            onClick={() => onSeek?.(sub.startTime)}
            className={`subtitle-item ${
              currentIndex >= 0 && subtitles[currentIndex] === sub ? 'active' : ''
            }`}
          >
            <span className="subtitle-time">
              {formatTime(sub.startTime)}
            </span>
            <span className="subtitle-line">{sub.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export default SubtitleViewer;
