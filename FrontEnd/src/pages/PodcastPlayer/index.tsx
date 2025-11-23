import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { podcastApi } from '@/services/podcastApi';
import { episodeFormatters } from '@/utils/formatters';
import TranscriptViewer from '@/components/podcast/TranscriptViewer';
import type { Episode } from '@/types';

const PodcastPlayer = () => {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!episodeId) return;

    const fetchEpisode = async () => {
      try {
        const response = await podcastApi.getEpisode(episodeId);
        if (response.success) {
          setEpisode(response.data.episode);
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

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
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
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark">
      {/* Top App Bar */}
      <div className="flex items-center bg-transparent p-4 pb-2 justify-between">
        <button
          className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-transparent text-white/80 dark:text-white/80 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 hover:bg-white/10 transition-colors"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined text-white">expand_more</span>
        </button>
        <div className="flex flex-col items-center">
          <p className="text-xs font-normal leading-normal text-slate-300 dark:text-slate-400">
            正在播放
          </p>
          <h2 className="text-white text-base font-bold leading-tight tracking-[-0.015em]">
            {episode.title}
          </h2>
        </div>
        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-transparent text-white/80 dark:text-white/80 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-white">more_vert</span>
        </button>
      </div>

      {/* Cover Image */}
      <div className="flex w-full grow px-6 py-8">
        <div className="w-full gap-1 overflow-hidden bg-transparent aspect-square flex rounded-xl">
          <div
            className="w-full bg-center bg-no-repeat bg-cover aspect-auto flex-1 rounded-lg"
            style={{
              backgroundImage: `url('${episode.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLLimdLg5EGtNuZglsvyjmPPCFWXf1d1SwzaWk9ODNxbKt3wC9vTSSknitAgeW6r6EDXuKfHNdIkjQvgfJ9g8Aw7QABhjOCOu8743xXTX13oX63cb_cNad7GmMgyY2A7A1QNYqu2TRiS3bZEnJp_3tFzONPI3Km-F70PFOGz2870zFBNLHERTjMPGA7QmgguPd-zuaxaEmlbyYwEeaFqVNHj_9enZrR7FA6w3A8DKx29bx5T3IGL-fm4gvGQpvTVMb3w2g26c2C0g'}')`
            }}
          />
        </div>
      </div>

      {/* Episode Info Area */}
      <div className="px-6 py-4">
        <h1 className="text-white tracking-tight text-[24px] font-bold leading-tight text-left line-clamp-2">
          {episode.title}
        </h1>
        <p className="text-slate-300 dark:text-slate-400 text-sm font-normal leading-normal pt-2">
          {episode.topicTitle || '播客'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-2 p-6">
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
      <div className="flex items-center justify-center gap-8 px-6 py-4">
        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 w-14 bg-transparent text-white/80 dark:text-white/80 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-3xl">replay_10</span>
        </button>
        <button
          onClick={handlePlayPause}
          className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-20 w-20 bg-primary-light text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 shadow-lg shadow-primary-light/30 hover:bg-primary-light/90 transition-colors"
        >
          <span
            className="material-symbols-outlined text-5xl"
            style={{
              fontVariationSettings: "'FILL' 1"
            }}
          >
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 w-14 bg-transparent text-white/80 dark:text-white/80 gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-3xl">forward_30</span>
        </button>
      </div>

      {/* Action Button Bar */}
      <div className="flex items-center justify-between px-6 py-6">
        <div className="flex flex-col items-center justify-center gap-1 text-slate-300 dark:text-slate-400 hover:text-white w-16 cursor-pointer relative group">
          <span className="material-symbols-outlined text-2xl">speed</span>
          <span className="text-xs">{playbackRate}x</span>
          {/* Playback rate menu */}
          <div className="hidden group-hover:flex absolute bottom-full mb-2 bg-slate-800 rounded-lg p-2 flex-col gap-1 z-20">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => handlePlaybackRateChange(rate)}
                className={`px-3 py-1 text-sm rounded ${playbackRate === rate ? 'bg-primary-light text-white' : 'text-slate-300 hover:text-white'}`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
        <button className="flex flex-col items-center justify-center gap-1 text-slate-300 dark:text-slate-400 hover:text-white w-16">
          <span className="material-symbols-outlined text-2xl">dark_mode</span>
          <span className="text-xs">定时</span>
        </button>
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className={`flex flex-col items-center justify-center gap-1 w-16 ${showTranscript ? 'text-primary-light' : 'text-slate-300 dark:text-slate-400 hover:text-white'}`}
        >
          <span
            className="material-symbols-outlined text-2xl"
            style={{
              fontVariationSettings: "'FILL' 1"
            }}
          >
            description
          </span>
          <span className="text-xs">脚本</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-1 text-slate-300 dark:text-slate-400 hover:text-white w-16">
          <span className="material-symbols-outlined text-2xl">share</span>
          <span className="text-xs">分享</span>
        </button>
      </div>

      {/* Transcript Section */}
      {showTranscript && episode?.scriptUrl && (
        <div className="px-6 pb-8">
          <h3 className="text-white text-sm font-semibold mb-4">播客脚本</h3>
          <TranscriptViewer
            scriptUrl={episode.scriptUrl}
            currentTime={currentTime}
            duration={duration}
          />
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={episode.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
};

export default PodcastPlayer;
