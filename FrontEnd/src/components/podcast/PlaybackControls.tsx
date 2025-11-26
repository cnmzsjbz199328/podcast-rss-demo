

interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackRate: number;
  onPlayPause: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onPlaybackRateChange: (rate: number) => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const PlaybackControls = ({
  isPlaying,
  playbackRate,
  onPlayPause,
  onSkipBackward,
  onSkipForward,
  onPlaybackRateChange,
}: PlaybackControlsProps) => {

  return (
    <>
      {/* 播放控制按钮 */}
      <div className="flex items-center justify-center gap-8 px-6 py-4">
        {/* 后退10秒 */}
        <button
          onClick={onSkipBackward}
          className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 w-14 bg-transparent text-white/80 dark:text-white/80 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 hover:bg-white/10 transition-colors active:scale-95"
          title="后退10秒"
        >
          <span className="material-symbols-outlined text-3xl">replay_10</span>
        </button>

        {/* 播放/暂停 */}
        <button
          onClick={onPlayPause}
          className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-20 w-20 bg-primary-light text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 shadow-lg shadow-primary-light/30 hover:bg-primary-light/90 transition-colors active:scale-95"
          title={isPlaying ? '暂停' : '播放'}
        >
          <span
            className="material-symbols-outlined text-5xl"
            style={{
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        {/* 前进30秒 */}
        <button
          onClick={onSkipForward}
          className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 w-14 bg-transparent text-white/80 dark:text-white/80 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 hover:bg-white/10 transition-colors active:scale-95"
          title="前进30秒"
        >
          <span className="material-symbols-outlined text-3xl">forward_30</span>
        </button>
      </div>

      {/* 功能按钮栏 */}
      <div className="flex items-center justify-between px-6 py-6">
        {/* 倍速控制 */}
        <div className="flex flex-col items-center justify-center gap-1 text-slate-300 dark:text-slate-400 hover:text-white w-16 cursor-pointer relative group">
          <span className="material-symbols-outlined text-2xl">speed</span>
          <span className="text-xs">{playbackRate}x</span>
          {/* 倍速菜单 */}
          <div className="hidden group-hover:flex absolute bottom-full mb-2 bg-slate-800 rounded-lg p-2 flex-col gap-1 z-20">
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
      </div>
    </>
  );
};

export default PlaybackControls;
