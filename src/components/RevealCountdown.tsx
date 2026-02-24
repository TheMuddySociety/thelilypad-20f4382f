import React, { useState, useEffect } from "react";
import { Eye, Sparkles } from "lucide-react";
import { differenceInSeconds, format } from "date-fns";

interface RevealCountdownProps {
  scheduledRevealAt: string | null;
  isRevealed: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const calculateTimeRemaining = (targetDate: Date): TimeRemaining => {
  const now = new Date();
  const total = differenceInSeconds(targetDate, now);

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const days = Math.floor(total / (60 * 60 * 24));
  const hours = Math.floor((total % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((total % (60 * 60)) / 60);
  const seconds = total % 60;

  return { days, hours, minutes, seconds, total };
};

export const RevealCountdown: React.FC<RevealCountdownProps> = ({
  scheduledRevealAt,
  isRevealed,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [isRevealingSoon, setIsRevealingSoon] = useState(false);

  useEffect(() => {
    if (!scheduledRevealAt || isRevealed) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const revealDate = new Date(scheduledRevealAt);
      const remaining = calculateTimeRemaining(revealDate);

      if (remaining.total <= 0) {
        setTimeRemaining(null);
      } else {
        setTimeRemaining(remaining);
        // Mark as revealing soon if less than 1 hour
        setIsRevealingSoon(remaining.total < 3600);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [scheduledRevealAt, isRevealed]);

  // Don't show if already revealed or no scheduled time
  if (isRevealed || !scheduledRevealAt || !timeRemaining) {
    return null;
  }

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-background/80 backdrop-blur-sm border border-primary/30 rounded-lg px-3 py-2 min-w-[52px] shadow-lg shadow-primary/10">
        <span className="text-2xl font-bold tabular-nums text-primary">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  );

  return (
    <div className={`p-5 rounded-xl border-2 ${isRevealingSoon
        ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 border-amber-500/40'
        : 'bg-gradient-to-br from-primary/10 via-primary/5 to-purple-500/10 border-primary/30'
      } relative overflow-hidden`}>
      {/* Animated background effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10">
        <div className={`flex items-center justify-center gap-2 mb-4 ${isRevealingSoon ? 'text-amber-500' : 'text-primary'
          }`}>
          {isRevealingSoon ? (
            <Sparkles className="w-5 h-5 animate-pulse" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
          <span className="text-sm font-semibold uppercase tracking-wide">
            {isRevealingSoon ? 'Revealing Soon!' : 'Reveal Countdown'}
          </span>
          {isRevealingSoon && (
            <Sparkles className="w-5 h-5 animate-pulse" />
          )}
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {timeRemaining.days > 0 && (
            <>
              <TimeBlock value={timeRemaining.days} label="Days" />
              <span className="text-2xl font-bold text-primary/60 mb-5">:</span>
            </>
          )}
          <TimeBlock value={timeRemaining.hours} label="Hours" />
          <span className="text-2xl font-bold text-primary/60 mb-5">:</span>
          <TimeBlock value={timeRemaining.minutes} label="Mins" />
          <span className="text-2xl font-bold text-primary/60 mb-5">:</span>
          <TimeBlock value={timeRemaining.seconds} label="Secs" />
        </div>

        {!isNaN(new Date(scheduledRevealAt).getTime()) && (
          <p className="text-xs text-center text-muted-foreground mt-4">
            NFTs reveal on {format(new Date(scheduledRevealAt), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        )}
      </div>
    </div>
  );
};

export default RevealCountdown;
