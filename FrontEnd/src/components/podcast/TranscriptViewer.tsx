import { useState, useEffect } from 'react';
import './TranscriptViewer.css';

interface TranscriptViewerProps {
  scriptUrl: string | null;
  currentTime: number;
  duration: number;
}

interface ScriptSegment {
  time: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

export const TranscriptViewer = ({
  scriptUrl,
  currentTime,
  duration,
}: TranscriptViewerProps) => {
  const [scriptText, setScriptText] = useState<string>('');
  const [segments, setSegments] = useState<ScriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);

  // 获取脚本文本
  useEffect(() => {
    if (!scriptUrl) return;

    const fetchScript = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(scriptUrl);
        if (!response.ok) throw new Error('Failed to fetch transcript');
        const text = await response.text();
        setScriptText(text);
        parseSegments(text, duration);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transcript');
        setScriptText('');
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [scriptUrl, duration]);

  // 按时间点分割脚本（简单策略：均匀分割）
  const parseSegments = (text: string, totalDuration: number) => {
    if (!text || totalDuration <= 0) {
      setSegments([{ time: 0, text, startIndex: 0, endIndex: text.length }]);
      return;
    }

    // 按句子分割（以。！？为分隔符）
    const sentences = text.match(/[^。！？\n]+[。！？]|[^。！？\n]+$/g) || [text];

    // 根据句子数量均匀分配时间
    const segmentDuration = totalDuration / sentences.length;
    const newSegments: ScriptSegment[] = [];
    let currentIndex = 0;

    sentences.forEach((sentence, i) => {
      newSegments.push({
        time: i * segmentDuration,
        text: sentence.trim(),
        startIndex: currentIndex,
        endIndex: currentIndex + sentence.length,
      });
      currentIndex += sentence.length;
    });

    setSegments(newSegments);
  };

  // 根据当前播放时间找到对应的段落
  useEffect(() => {
    const index = segments.findIndex(
      (seg, idx) => currentTime >= seg.time && (idx === segments.length - 1 || currentTime < segments[idx + 1].time)
    );
    setCurrentSegmentIndex(index);
  }, [currentTime, segments]);

  if (!scriptUrl) {
    return null;
  }

  if (loading) {
    return (
      <div className="transcript-viewer">
        <div className="transcript-loading">
          <p className="text-slate-400">加载脚本中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transcript-viewer">
        <div className="transcript-error">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transcript-viewer">
      <div className="transcript-content">
        {segments.length > 0 ? (
          segments.map((segment, index) => (
            <span
              key={index}
              className={`transcript-segment ${
                index === currentSegmentIndex ? 'active' : ''
              } ${index < currentSegmentIndex ? 'passed' : ''}`}
            >
              {segment.text}{' '}
            </span>
          ))
        ) : (
          <p className="text-slate-400 text-sm">{scriptText}</p>
        )}
      </div>
    </div>
  );
};

export default TranscriptViewer;
