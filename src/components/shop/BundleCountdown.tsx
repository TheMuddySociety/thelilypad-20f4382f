import React from "react";
import { useBundleCountdown } from "@/hooks/useBundleCountdown";
import { Clock, Timer, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BundleCountdownProps {
  startsAt: string | null;
  expiresAt: string | null;
  isLimitedTime: boolean;
  variant?: "badge" | "full" | "compact";
}

export const BundleCountdown: React.FC<BundleCountdownProps> = ({
  startsAt,
  expiresAt,
  isLimitedTime,
  variant = "badge",
}) => {
  const countdown = useBundleCountdown(startsAt, expiresAt, isLimitedTime);

  if (!isLimitedTime || !expiresAt) return null;

  if (countdown.isExpired) {
    return (
      <Badge variant="secondary" className="gap-1 opacity-60">
        <Clock className="w-3 h-3" />
        Expired
      </Badge>
    );
  }

  const isUrgent = countdown.totalSeconds < 3600; // Less than 1 hour
  const isVeryUrgent = countdown.totalSeconds < 600; // Less than 10 minutes

  if (variant === "badge") {
    return (
      <Badge 
        className={`gap-1 ${
          countdown.isNotStarted 
            ? "bg-blue-500/20 text-blue-600 border-blue-500/30"
            : isVeryUrgent 
              ? "bg-red-500 text-white animate-pulse border-0" 
              : isUrgent 
                ? "bg-orange-500/20 text-orange-600 border-orange-500/30"
                : "bg-amber-500/20 text-amber-600 border-amber-500/30"
        }`}
      >
        {countdown.isNotStarted ? (
          <Clock className="w-3 h-3" />
        ) : isVeryUrgent ? (
          <Flame className="w-3 h-3" />
        ) : (
          <Timer className="w-3 h-3" />
        )}
        {countdown.isNotStarted ? "Starts in " : ""}
        {countdown.days > 0 && `${countdown.days}d `}
        {countdown.hours > 0 && `${countdown.hours}h `}
        {countdown.minutes}m
        {countdown.days === 0 && ` ${countdown.seconds}s`}
      </Badge>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-1 text-sm font-medium ${
        countdown.isNotStarted 
          ? "text-blue-600"
          : isVeryUrgent 
            ? "text-red-500 animate-pulse" 
            : isUrgent 
              ? "text-orange-500"
              : "text-amber-600"
      }`}>
        {countdown.isNotStarted ? (
          <Clock className="w-4 h-4" />
        ) : isVeryUrgent ? (
          <Flame className="w-4 h-4" />
        ) : (
          <Timer className="w-4 h-4" />
        )}
        <span>
          {countdown.isNotStarted ? "Starts " : "Ends "}
          {countdown.days > 0 && `${countdown.days}d `}
          {countdown.hours > 0 && `${countdown.hours}h `}
          {countdown.minutes}m {countdown.seconds}s
        </span>
      </div>
    );
  }

  // Full variant - detailed countdown display
  return (
    <div className={`rounded-lg p-4 ${
      countdown.isNotStarted 
        ? "bg-blue-500/10 border border-blue-500/20"
        : isVeryUrgent 
          ? "bg-red-500/20 border border-red-500/30 animate-pulse" 
          : isUrgent 
            ? "bg-orange-500/10 border border-orange-500/20"
            : "bg-amber-500/10 border border-amber-500/20"
    }`}>
      <div className="flex items-center gap-2 mb-3">
        {countdown.isNotStarted ? (
          <>
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-blue-600">Coming Soon</span>
          </>
        ) : isVeryUrgent ? (
          <>
            <Flame className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-red-500">Final Minutes!</span>
          </>
        ) : isUrgent ? (
          <>
            <Timer className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-orange-600">Hurry, Almost Gone!</span>
          </>
        ) : (
          <>
            <Timer className="w-5 h-5 text-amber-500" />
            <span className="font-semibold text-amber-600">Limited Time Offer</span>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-background/80 rounded-lg p-2">
          <div className="text-2xl font-bold">{countdown.days}</div>
          <div className="text-xs text-muted-foreground">Days</div>
        </div>
        <div className="bg-background/80 rounded-lg p-2">
          <div className="text-2xl font-bold">{countdown.hours}</div>
          <div className="text-xs text-muted-foreground">Hours</div>
        </div>
        <div className="bg-background/80 rounded-lg p-2">
          <div className="text-2xl font-bold">{countdown.minutes}</div>
          <div className="text-xs text-muted-foreground">Mins</div>
        </div>
        <div className="bg-background/80 rounded-lg p-2">
          <div className="text-2xl font-bold">{countdown.seconds}</div>
          <div className="text-xs text-muted-foreground">Secs</div>
        </div>
      </div>
      
      <p className="text-xs text-center text-muted-foreground mt-2">
        {countdown.isNotStarted ? "Offer starts soon!" : "Don't miss out on this deal!"}
      </p>
    </div>
  );
};
