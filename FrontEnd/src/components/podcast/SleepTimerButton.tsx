import { useState, useEffect } from 'react';
import './ActionButtonBar.css';

interface SleepTimerButtonProps {
  onTimerChange: (minutes: number | null) => void;
}

const TIMER_OPTIONS: (number | null)[] = [null, 5, 10, 15, 30, 45, 60];
const TIMER_LABELS: Record<string, string> = {
  'null': 'timer',
  '5': '5分钟',
  '10': '10分钟',
  '15': '15分钟',
  '30': '30分钟',
  '45': '45分钟',
  '60': '60分钟',
};

export const SleepTimerButton = ({ onTimerChange }: SleepTimerButtonProps) => {
  const [timer, setTimer] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  // 倒计时逻辑
  useEffect(() => {
    if (!isActive || remainingTime === null || remainingTime <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev === null || prev <= 1) {
          setIsActive(false);
          setTimer(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, remainingTime]);

  const handleTimerClick = () => {
    const currentIndex = TIMER_OPTIONS.indexOf(timer);
    const nextIndex = (currentIndex + 1) % TIMER_OPTIONS.length;
    const nextTimer = TIMER_OPTIONS[nextIndex];

    setTimer(nextTimer);

    if (nextTimer === null) {
      setIsActive(false);
      setRemainingTime(null);
      onTimerChange(null);
    } else {
      setIsActive(true);
      setRemainingTime(nextTimer * 60);
      onTimerChange(nextTimer);
    }
  };

  const getDisplayText = () => {
    if (!isActive || remainingTime === null) {
      return TIMER_LABELS[String(timer)] || '定时';
    }

    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    if (minutes > 0) {
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  return (
    <button
      onClick={handleTimerClick}
      className={`action-button ${
        isActive ? 'text-primary-light' : ''
      }`}
      title={TIMER_LABELS[String(timer)] || '定时'}
    >
      <span className="material-symbols-outlined text-2xl">schedule</span>
      <span className="text-xs truncate max-w-16 leading-tight">
        {getDisplayText()}
      </span>
    </button>
  );
};

export default SleepTimerButton;
