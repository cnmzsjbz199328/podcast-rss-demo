import { useTranscriptSync } from '@/hooks/useTranscriptSync';
import './ScriptCard.css';

interface ScriptCardProps {
  scriptUrl: string | null;
  currentTime: number;
  duration: number;
  visibleLines?: number;
}

export const ScriptCard = ({
  scriptUrl,
  currentTime,
  duration,
  visibleLines = 3,
}: ScriptCardProps) => {
  const { segments, activeSegmentIndex, loading, error } = useTranscriptSync({
    scriptUrl,
    currentTime,
    duration,
  });

  if (!scriptUrl || loading || error || segments.length === 0) {
    return null;
  }

  // 计算可见范围：以当前段为中心显示 visibleLines 行
  const startIndex = Math.max(0, activeSegmentIndex - Math.floor(visibleLines / 2));
  const endIndex = Math.min(segments.length, startIndex + visibleLines);
  const visibleSegments = segments.slice(startIndex, endIndex);

  return (
    <div className="script-card">
      <div className="script-card-content">
        {visibleSegments.map((segment, idx) => {
          const actualIndex = startIndex + idx;
          return (
            <div
              key={actualIndex}
              className={`script-card-line ${
                actualIndex === activeSegmentIndex ? 'active' : ''
              } ${actualIndex < activeSegmentIndex ? 'passed' : ''}`}
            >
              {segment.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScriptCard;
