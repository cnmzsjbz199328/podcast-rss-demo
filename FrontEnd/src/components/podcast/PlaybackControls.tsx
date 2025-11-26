
interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
}

export const PlaybackControls = ({
  isPlaying,
  onPlayPause,
  onSkipBackward,
  onSkipForward,
}: PlaybackControlsProps) => {
  return (
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
  );
};

export default PlaybackControls;
