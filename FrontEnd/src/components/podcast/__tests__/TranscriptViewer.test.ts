import { describe, expect, it } from 'vitest';

type TranscriptSegment = {
  text: string;
  start: number;
  end: number;
};

const SAMPLE_SCRIPT = '这是一个测试脚本。第一句话。第二句话。第三句话。';
const TOTAL_DURATION = 12; // 12 秒

const splitSentences = (text: string) => text.match(/[^。！？\n]+[。！？]|[^。！？\n]+$/g) || [text];

const buildSegments = (text: string, duration: number): TranscriptSegment[] => {
  const sentences = splitSentences(text);
  const totalChars = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  let cursor = 0;

  return sentences.map((sentence) => {
    const lengthRatio = sentence.length / totalChars;
    const segmentDuration = lengthRatio * duration;
    const segment: TranscriptSegment = {
      text: sentence,
      start: Number(cursor.toFixed(2)),
      end: Number((cursor + segmentDuration).toFixed(2)),
    };
    cursor += segmentDuration;
    return segment;
  });
};

const getActiveSegmentIndex = (segments: TranscriptSegment[], time: number) =>
    segments.findIndex((segment, index) => {
        const nextStart = segments[index + 1]?.start ?? Number.POSITIVE_INFINITY;
        return time >= segment.start && time < nextStart;
    });

const transcriptStyles = {
  'transcript-segment': {
    display: 'inline',
    padding: '2px 4px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  'transcript-segment.active': {
    background: 'rgba(59, 130, 246, 0.3)',
    color: 'rgb(191, 219, 254)',
    fontWeight: '600',
    borderRadius: '3px',
    boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
    animation: 'pulse-active 0.6s ease-in-out infinite',
  },
  'transcript-segment.passed': {
    color: 'rgba(148, 163, 184, 0.5)',
    fontWeight: '400',
  },
};

describe('TranscriptViewer script timing', () => {
  it('splits a Chinese script into sequential segments', () => {
    const sentences = splitSentences(SAMPLE_SCRIPT);
    expect(sentences).toHaveLength(4);
    expect(sentences[0]).toBe('这是一个测试脚本。');
  expect(sentences[sentences.length - 1]).toBe('第三句话。');
  });

  it('builds proportional segments that cover the total duration', () => {
    const segments = buildSegments(SAMPLE_SCRIPT, TOTAL_DURATION);
    expect(segments).toHaveLength(4);
    expect(segments[0]).toEqual({ text: '这是一个测试脚本。', start: 0, end: 4.5 });
  expect(segments[segments.length - 1]).toEqual({ text: '第三句话。', start: 9.5, end: 12 });
  const lastSegment = segments[segments.length - 1];
    expect(lastSegment?.end).toBeCloseTo(TOTAL_DURATION, 2);
  });

  it('identifies the active segment for arbitrary playback times', () => {
    const segments = buildSegments(SAMPLE_SCRIPT, TOTAL_DURATION);
  const checkpoints = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5];
  const expectedIndexes = [0, 0, 0, 1, 1, 2, 2, 3];

    checkpoints.forEach((time, idx) => {
      expect(getActiveSegmentIndex(segments, time)).toBe(expectedIndexes[idx]);
    });
  });
});

describe('TranscriptViewer styling contract', () => {
  it('tracks the required utility classes for segment states', () => {
    expect(transcriptStyles['transcript-segment']).toMatchObject({
      display: 'inline',
      padding: '2px 4px',
    });

    expect(transcriptStyles['transcript-segment.active']).toMatchObject({
      background: 'rgba(59, 130, 246, 0.3)',
      fontWeight: '600',
    });

    expect(transcriptStyles['transcript-segment.passed']).toMatchObject({
      color: 'rgba(148, 163, 184, 0.5)',
    });
  });
});
