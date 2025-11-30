import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { podcastApi } from '@/services/podcastApi';
import { episodeFormatters } from '@/utils/formatters';
import { getRandomCoverImage } from '@/utils/helpers';
import { useAudioController } from '@/hooks/useAudioController';
import ScriptCard from '@/components/podcast/ScriptCard';
import PlaybackControls from '@/components/podcast/PlaybackControls';
import ActionButtonBar from '@/components/podcast/ActionButtonBar';
import type { Episode } from '@/types';

const PodcastPlayer = () => {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isTranscriptExpanded, setTranscriptExpanded] = useState(true);

  // 使用音频控制器 hook
  const audioController = useAudioController(audioRef, {
    onTimeUpdate: setCurrentTime,
    onDurationChange: setDuration,
    onEnded: () => setIsPlaying(false),
  });

  // 获取剧集数据
  useEffect(() => {
    if (!episodeId) return;

    const fetchEpisode = async () => {
      try {
        const response = await podcastApi.getEpisode(episodeId);
        if (response.success) {
          setEpisode(response.data);
        } else {
          setError('获取播客详情失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchEpisode();
  }, [episodeId]);

  // 播放/暂停
  const handlePlayPause = async () => {
    if (isPlaying) {
      audioController.pause();
      setIsPlaying(false);
    } else {
      await audioController.play();
      setIsPlaying(true);
    }
  };

  // 进度条跳转
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    audioController.seekTo(time);
  };

  // 播放速率变更
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    audioController.setPlaybackRate(rate);
  };

  // 定时器变更
  const handleSleepTimerChange = (minutes: number | null) => {
    audioController.setSleepTimer(minutes);
  };

  // 前进30秒
  const handleSkipForward = () => {
    audioController.skipForward(30);
  };

  // 后退10秒
  const handleSkipBackward = () => {
    audioController.skipBackward(10);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-secondary-text-dark">加载中...</p>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-lg">
          {error || '播客不存在'}
        </div>
      </div>
    );
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center justify-center w-full min-h-screen bg-background-light dark:bg-background-dark">
      <div className="relative flex h-auto w-full max-w-sm flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark">
        {/* Top App Bar */}
        <div className="flex items-center justify-start px-2 py-1">
          <button
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-transparent hover:bg-white/10 transition-colors"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <span className="material-symbols-outlined text-lg text-white">expand_more</span>
          </button>
        </div>

        {/* Cover Image with Script Card overlay */}
        <div className="px-3 py-0.5 flex justify-center">
          <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '1 / 1' }}>
            <div
              className="absolute inset-0 bg-center bg-no-repeat bg-cover"
              style={{
                backgroundImage: `url('${episode.imageUrl || getRandomCoverImage(episode.id)}')`
              }}
            />
            {episode.scriptUrl && isTranscriptExpanded && (
              <div className="pointer-events-none absolute inset-0 p-2">
                <div className="pointer-events-auto h-full w-full">
                  <ScriptCard
                    scriptUrl={episode.scriptUrl}
                    currentTime={currentTime}
                    duration={duration}
                    visibleLines={3}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Episode Info Area */}
        <div className="px-4 py-1">
          <h1 className="text-white tracking-tight text-base font-bold leading-snug text-left line-clamp-2">
            {episode.title}
          </h1>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-1 px-4 py-1">
          <div className="relative group/progress">
            <div className="rounded-full bg-slate-300/30 dark:bg-slate-700 h-2">
              <div
                className="h-2 rounded-full bg-primary-light transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="absolute top-1/2 -translate-y-1/2 w-full h-2 cursor-pointer opacity-0 z-10"
            />
            <div
              className="absolute h-4 w-4 bg-white rounded-full -top-1 transform -translate-x-1/2 opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between">
            <p className="text-slate-300 dark:text-slate-400 text-xs font-normal leading-normal">
              {episodeFormatters.duration(Math.floor(currentTime))}
            </p>
            <p className="text-slate-300 dark:text-slate-400 text-xs font-normal leading-normal">
              {episodeFormatters.duration(Math.floor(duration))}
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <PlaybackControls
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onSkipBackward={handleSkipBackward}
          onSkipForward={handleSkipForward}
        />

        {/* Action Button Bar */}
        <ActionButtonBar
          playbackRate={playbackRate}
          isTranscriptExpanded={isTranscriptExpanded}
          hasScriptUrl={!!episode?.scriptUrl}
          onPlaybackRateChange={handlePlaybackRateChange}
          onTimerChange={handleSleepTimerChange}
          onTranscriptToggle={() => setTranscriptExpanded((prev) => !prev)}
        />

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={episode.audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      </div>
    </div>
  );
};

export default PodcastPlayer;
