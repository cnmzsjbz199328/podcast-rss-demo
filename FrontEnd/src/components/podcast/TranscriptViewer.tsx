import { useTranscriptSync } from '@/hooks/useTranscriptSync';
import './TranscriptViewer.css';

interface TranscriptViewerProps {
  scriptUrl: string | null;
  currentTime: number;
  duration: number;
}

export const TranscriptViewer = ({
  scriptUrl,
  currentTime,
  duration,
}: TranscriptViewerProps) => {
  const {
    scriptText,
    segments,
    activeSegmentIndex,
    loading,
    error,
    segmentRefs,
    registerContainer,
  } = useTranscriptSync({
    scriptUrl,
    currentTime,
    duration,
  });

  if (!scriptUrl) {
    return null;
  }

  if (loading) {
    return (
      <div className="transcript-viewer" ref={registerContainer}>
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

  if (segments.length === 0) {
    return (
      <div className="transcript-viewer">
        <div className="transcript-content">
          <p className="text-slate-400 text-sm">{scriptText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transcript-viewer" ref={registerContainer}>
      <div className="transcript-content">
        {segments.map((segment, index) => (
          <span
            key={index}
            ref={(el) => {
              if (el) {
                segmentRefs.current[index] = el as HTMLSpanElement;
              }
            }}
            className={`transcript-segment ${index === activeSegmentIndex ? 'active' : ''} ${
              index < activeSegmentIndex ? 'passed' : ''
            }`}
            data-index={index}
            data-time={segment.time}
          >
            {segment.text}{' '}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TranscriptViewer;
