import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

interface ScriptSegment {
  time: number;
  endTime: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

interface UseTranscriptSyncOptions {
  scriptUrl: string | null;
  currentTime: number;
  duration: number;
}

const MAX_SEGMENT_CHARS = 180;

const chunkSentence = (sentence: string): string[] => {
  if (sentence.length <= MAX_SEGMENT_CHARS) return [sentence];
  const chunks: string[] = [];
  let index = 0;
  while (index < sentence.length) {
    chunks.push(sentence.slice(index, index + MAX_SEGMENT_CHARS));
    index += MAX_SEGMENT_CHARS;
  }
  return chunks;
};

const splitIntoSentences = (text: string): string[] => {
  const cleaned = text.replace(/\r/g, '').trim();
  if (!cleaned) return [];

  const blocks = cleaned.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const sentences: string[] = [];

  blocks.forEach((block) => {
    const matches = block.match(/[^。！？.!?\n]+[。！？.!?]+|[^。！？.!?\n]+/g);
    if (matches) {
      matches.forEach((sentence) => {
        chunkSentence(sentence.trim()).forEach((chunk) => {
          if (chunk) sentences.push(chunk);
        });
      });
    } else {
      chunkSentence(block).forEach((chunk) => {
        if (chunk) sentences.push(chunk);
      });
    }
  });

  return sentences;
};

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
  const containerRef = useRef<HTMLDivElement | null>(null);

  const registerContainer = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
  }, []);

  useEffect(() => {
    if (!scriptUrl) {
      setScriptText('');
      setSegments([]);
      segmentRefs.current = [];
      return;
    }

    const fetchScript = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(scriptUrl);
        if (!response.ok) throw new Error('Failed to fetch transcript');
        const text = await response.text();
        setScriptText(text);
        segmentRefs.current = [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transcript');
        setScriptText('');
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [scriptUrl]);

  const parseSegments = useCallback((text: string, totalDuration: number) => {
    if (!text.trim()) {
      setSegments([]);
      return;
    }

    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) {
      setSegments([]);
      return;
    }

    const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
    if (totalChars === 0) {
      setSegments([{ time: 0, endTime: totalDuration, text, startIndex: 0, endIndex: text.length }]);
      return;
    }

    const newSegments: ScriptSegment[] = [];
    let cursorTime = 0;
    let cursorIndex = 0;

    sentences.forEach((sentence, idx) => {
      const charRatio = sentence.length / totalChars;
      const segmentDuration = totalDuration > 0 ? charRatio * totalDuration : 0;
      const segmentStart = cursorTime;
      const isLast = idx === sentences.length - 1;
      const segmentEnd = isLast ? (totalDuration || segmentStart) : segmentStart + segmentDuration;

      newSegments.push({
        time: segmentStart,
        endTime: segmentEnd,
        text: sentence.trim(),
        startIndex: cursorIndex,
        endIndex: cursorIndex + sentence.length,
      });

      cursorTime = segmentEnd;
      cursorIndex += sentence.length;
    });

    if (totalDuration > 0 && newSegments.length > 0) {
      newSegments[newSegments.length - 1].endTime = totalDuration;
    }

    setSegments(newSegments);
  }, []);

  useEffect(() => {
    if (!scriptText) {
      setSegments([]);
      return;
    }
    parseSegments(scriptText, duration);
  }, [scriptText, duration, parseSegments]);

  const activeIndex = useMemo(() => {
    return segments.findIndex(
      (seg) => currentTime >= seg.time && (seg.endTime ? currentTime < seg.endTime : true)
    );
  }, [currentTime, segments]);

  useEffect(() => {
    setActiveSegmentIndex(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    if (activeSegmentIndex < 0) return;
    const element = segmentRefs.current[activeSegmentIndex];
    const container = containerRef.current;
    if (!element || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const offset =
      elementRect.top - containerRect.top - containerRect.height / 2 + elementRect.height / 2;

    container.scrollTo({
      top: container.scrollTop + offset,
      behavior: 'smooth',
    });
  }, [activeSegmentIndex]);

  return {
    scriptText,
    segments,
    activeSegmentIndex,
    loading,
    error,
    segmentRefs,
    registerContainer,
  };
};
