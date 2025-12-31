import { useState, useEffect, useMemo } from "react";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  isNotStarted: boolean;
}

export const useBundleCountdown = (
  startsAt: string | null,
  expiresAt: string | null,
  isLimitedTime: boolean
): CountdownTime => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isLimitedTime || !expiresAt) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isLimitedTime, expiresAt]);

  return useMemo(() => {
    if (!isLimitedTime || !expiresAt) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: false,
        isNotStarted: false,
      };
    }

    const startTime = startsAt ? new Date(startsAt).getTime() : 0;
    const endTime = new Date(expiresAt).getTime();
    const isNotStarted = startTime > now;
    const isExpired = endTime <= now;

    // If not started yet, countdown to start
    const targetTime = isNotStarted ? startTime : endTime;
    const diff = Math.max(0, targetTime - now);
    const totalSeconds = Math.floor(diff / 1000);

    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds,
      isExpired,
      isNotStarted,
    };
  }, [now, startsAt, expiresAt, isLimitedTime]);
};

export const formatCountdown = (countdown: CountdownTime): string => {
  if (countdown.isExpired) return "Expired";
  if (countdown.isNotStarted) {
    if (countdown.days > 0) {
      return `Starts in ${countdown.days}d ${countdown.hours}h`;
    }
    return `Starts in ${countdown.hours}h ${countdown.minutes}m`;
  }
  
  if (countdown.days > 0) {
    return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`;
  }
  if (countdown.hours > 0) {
    return `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;
  }
  if (countdown.minutes > 0) {
    return `${countdown.minutes}m ${countdown.seconds}s`;
  }
  return `${countdown.seconds}s`;
};
