import React, { useState, useEffect } from "react";
import { Clock, Timer, CheckCircle, AlertCircle } from "lucide-react";
import { differenceInSeconds, format } from "date-fns";

interface MintCountdownProps {
  startTime: string | null;
  endTime: string | null;
  phaseName: string;
  isSoldOut?: boolean;
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

type PhaseStatus = 'upcoming' | 'active' | 'ending-soon' | 'ended' | 'no-schedule';

export const MintCountdown: React.FC<MintCountdownProps> = ({
  startTime,
  endTime,
  phaseName,
  isSoldOut = false,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [status, setStatus] = useState<PhaseStatus>('no-schedule');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const start = startTime ? new Date(startTime) : null;
      const end = endTime ? new Date(endTime) : null;

      // Determine phase status
      if (!start && !end) {
        setStatus('no-schedule');
        setTimeRemaining(null);
        return;
      }

      if (start && now < start) {
        // Phase hasn't started yet
        setStatus('upcoming');
        setTimeRemaining(calculateTimeRemaining(start));
      } else if (end && now < end) {
        // Phase is active but has an end time
        const remaining = calculateTimeRemaining(end);
        // If less than 1 hour remaining, mark as ending soon
        if (remaining.total < 3600) {
          setStatus('ending-soon');
        } else {
          setStatus('active');
        }
        setTimeRemaining(remaining);
      } else if (end && now >= end) {
        // Phase has ended
        setStatus('ended');
        setTimeRemaining(null);
      } else {
        // Active with no end time
        setStatus('active');
        setTimeRemaining(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  if (isSoldOut) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Phase Complete - Sold Out!</span>
        </div>
      </div>
    );
  }

  if (status === 'no-schedule') {
    return null;
  }

  if (status === 'ended') {
    return (
      <div className="p-3 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{phaseName} has ended</span>
        </div>
      </div>
    );
  }

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-background border border-border rounded-lg px-3 py-2 min-w-[48px]">
        <span className="text-xl font-bold tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );

  const statusConfig = {
    upcoming: {
      icon: Clock,
      label: `${phaseName} starts in`,
      bgClass: 'bg-blue-500/10 border-blue-500/30',
      textClass: 'text-blue-500',
    },
    active: {
      icon: Timer,
      label: `${phaseName} ends in`,
      bgClass: 'bg-green-500/10 border-green-500/30',
      textClass: 'text-green-500',
    },
    'ending-soon': {
      icon: AlertCircle,
      label: `${phaseName} ending soon!`,
      bgClass: 'bg-amber-500/10 border-amber-500/30',
      textClass: 'text-amber-500',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config || !timeRemaining) return null;

  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bgClass}`}>
      <div className={`flex items-center gap-2 mb-3 ${config.textClass}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      
      <div className="flex items-center justify-center gap-2">
        {timeRemaining.days > 0 && (
          <>
            <TimeBlock value={timeRemaining.days} label="Days" />
            <span className="text-xl font-bold text-muted-foreground mb-4">:</span>
          </>
        )}
        <TimeBlock value={timeRemaining.hours} label="Hrs" />
        <span className="text-xl font-bold text-muted-foreground mb-4">:</span>
        <TimeBlock value={timeRemaining.minutes} label="Min" />
        <span className="text-xl font-bold text-muted-foreground mb-4">:</span>
        <TimeBlock value={timeRemaining.seconds} label="Sec" />
      </div>

      {startTime && status === 'upcoming' && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          Starts: {format(new Date(startTime), "MMM d, yyyy 'at' h:mm a")}
        </p>
      )}
      {endTime && (status === 'active' || status === 'ending-soon') && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          Ends: {format(new Date(endTime), "MMM d, yyyy 'at' h:mm a")}
        </p>
      )}
    </div>
  );
};

export default MintCountdown;
