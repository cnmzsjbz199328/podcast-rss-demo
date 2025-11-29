import './ActionButtonBar.css';
import SleepTimerButton from './SleepTimerButton';

interface ActionButtonBarProps {
  playbackRate: number;
  isTranscriptExpanded: boolean;
  hasScriptUrl: boolean;
  onPlaybackRateChange: (rate: number) => void;
  onTimerChange: (minutes: number | null) => void;
  onTranscriptToggle: () => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const ActionButtonBar = ({
  playbackRate,
  isTranscriptExpanded,
  hasScriptUrl,
  onPlaybackRateChange,
  onTimerChange,
  onTranscriptToggle,
}: ActionButtonBarProps) => {
  return (
    <div className="flex items-center justify-end gap-6 px-4 py-3">
      {/* Playback Speed */}
      <div className="action-button relative group">
        <span className="material-symbols-outlined text-xl">speed</span>
        <span className="text-xs leading-tight">{playbackRate}x</span>
        <div className="hidden group-hover:flex absolute bottom-full right-0 mb-2 bg-slate-800 rounded-lg p-2 flex-col gap-1 z-20">
          {PLAYBACK_RATES.map((rate) => (
            <button
              key={rate}
              onClick={() => onPlaybackRateChange(rate)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                playbackRate === rate
                  ? 'bg-primary-light text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Sleep Timer - using SleepTimerButton component */}
      <SleepTimerButton onTimerChange={onTimerChange} />

      {/* Script Toggle */}
      <button
        onClick={onTranscriptToggle}
        disabled={!hasScriptUrl}
        className={`action-button disabled:opacity-50 disabled:cursor-not-allowed ${
          isTranscriptExpanded ? 'text-primary-light' : ''
        }`}
      >
        <span
          className="material-symbols-outlined text-xl"
          style={{
            fontVariationSettings: "'FILL' 1",
          }}
        >
          description
        </span>
        <span className="text-xs leading-tight">script</span>
      </button>

      {/* Share */}
      <button className="action-button">
        <span className="material-symbols-outlined text-xl">share</span>
        <span className="text-xs leading-tight">share</span>
      </button>
    </div>
  );
};

export default ActionButtonBar;
