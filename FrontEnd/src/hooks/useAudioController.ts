import { useRef, useEffect, useCallback } from 'react';

interface AudioControllerConfig {
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export const useAudioController = (
  audioRef: React.RefObject<HTMLAudioElement>,
  config: AudioControllerConfig = {}
) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 播放
  const play = useCallback(async () => {
    try {
      await audioRef.current?.play();
      config.onPlay?.();
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to play:', error);
      }
    }
  }, [audioRef, config]);

  // 暂停
  const pause = useCallback(() => {
    audioRef.current?.pause();
    config.onPause?.();
  }, [audioRef, config]);

  // 跳转到指定时间
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration));
    }
  }, [audioRef]);

  // 前进指定秒数
  const skipForward = useCallback((seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.min(
        audioRef.current.currentTime + seconds,
        audioRef.current.duration
      );
      audioRef.current.currentTime = newTime;
    }
  }, [audioRef]);

  // 后退指定秒数
  const skipBackward = useCallback((seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
      audioRef.current.currentTime = newTime;
    }
  }, [audioRef]);

  // 设置播放速度
  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [audioRef]);

  // 设置定时器
  const setSleepTimer = useCallback((minutes: number | null) => {
    // 清除旧定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // 设置新定时器
    if (minutes !== null && minutes > 0) {
      timerRef.current = setTimeout(() => {
        pause();
        timerRef.current = null;
      }, minutes * 60 * 1000);
    }
  }, [pause]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 监听音频事件
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      config.onTimeUpdate?.(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      config.onDurationChange?.(audio.duration);
    };

    const handleEnded = () => {
      config.onEnded?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef, config]);

  return {
    play,
    pause,
    seekTo,
    skipForward,
    skipBackward,
    setPlaybackRate,
    setSleepTimer,
  };
};
