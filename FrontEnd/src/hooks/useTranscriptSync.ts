import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

interface ScriptSegment {
  time: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

interface UseTranscriptSyncOptions {
  scriptUrl: string | null;
  currentTime: number;
  duration: number;
}

export const useTranscriptSync = ({
  scriptUrl,
  currentTime,
  duration,
}: UseTranscriptSyncOptions) => {
  const [scriptText, setScriptText] = useState<string>('');
  const [segments, setSegments] = useState<ScriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const segmentRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // 获取脚本
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

  // 分段逻辑：按句子分割，按字符长度加权分配时间
  const parseSegments = useCallback((text: string, totalDuration: number) => {
    if (!text || totalDuration <= 0) {
      setSegments([{ time: 0, text, startIndex: 0, endIndex: text.length }]);
      return;
    }

    // 按句子分割
    const sentences = text.match(/[^。！？\n]+[。！？]|[^。！？\n]+$/g) || [text];

    // 计算总字符数
    const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
    if (totalChars === 0) {
      setSegments([{ time: 0, text, startIndex: 0, endIndex: text.length }]);
      return;
    }

    // 根据字符长度加权分配时间
    const newSegments: ScriptSegment[] = [];
    let currentTime = 0;
    let currentIndex = 0;

    sentences.forEach((sentence) => {
      const charRatio = sentence.length / totalChars;
      const segmentDuration = charRatio * totalDuration;

      newSegments.push({
        time: currentTime,
        text: sentence.trim(),
        startIndex: currentIndex,
        endIndex: currentIndex + sentence.length,
      });

      currentTime += segmentDuration;
      currentIndex += sentence.length;
    });

    setSegments(newSegments);
  }, []);

  // 计算当前活跃段落
  const activeIndex = useMemo(() => {
    return segments.findIndex(
      (seg, idx) =>
        currentTime >= seg.time &&
        (idx === segments.length - 1 || currentTime < segments[idx + 1].time)
    );
  }, [currentTime, segments]);

  // 更新状态
  useEffect(() => {
    setActiveSegmentIndex(activeIndex);
  }, [activeIndex]);

  // 自动滚动到活跃段落
  useEffect(() => {
    if (activeSegmentIndex >= 0 && segmentRefs.current[activeSegmentIndex]) {
      const element = segmentRefs.current[activeSegmentIndex];
      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegmentIndex]);

  return {
    scriptText,
    segments,
    activeSegmentIndex,
    loading,
    error,
    segmentRefs,
  };
};
