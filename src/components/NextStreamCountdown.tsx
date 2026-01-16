import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock, Timer } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";

// Public streamer profile type (excludes sensitive wallet addresses)
type StreamerProfilePublic = Omit<Tables<"streamer_profiles">, "payout_wallet_address" | "sol_wallet_address">;

interface ScheduleItem {
  day: string;
  time: string;
  timezone?: string;
}

interface NextStreamCountdownProps {
  streamers: StreamerProfilePublic[];
}

const DAYS_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parseTimeToMinutes = (timeStr: string): number | null => {
  // Parse time strings like "8:00 PM", "20:00", "8pm", etc.
  const cleanTime = timeStr.trim().toLowerCase();
  
  // Try 24-hour format first (e.g., "20:00")
  const match24 = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }
  
  // Try 12-hour format (e.g., "8:00 PM", "8pm", "8:30pm")
  const match12 = cleanTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const period = match12[3];
    
    if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes < 60) {
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
  }
  
  return null;
};

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const NextStreamCountdown = ({ streamers }: NextStreamCountdownProps) => {
  const [now, setNow] = useState(new Date());

  // Update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Find the next upcoming stream
  const nextStream = useMemo(() => {
    const currentDayIndex = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let soonest: {
      streamer: StreamerProfilePublic;
      time: string;
      minutesFromNow: number;
      dayOffset: number;
    } | null = null;

    streamers.forEach((streamer) => {
      if (!streamer.schedule || !Array.isArray(streamer.schedule)) return;
      
      const scheduleItems = streamer.schedule as unknown as ScheduleItem[];
      
      scheduleItems.forEach((item) => {
        if (!item.day || !item.time) return;
        
        const dayIndex = DAYS_ORDER.indexOf(item.day);
        if (dayIndex === -1) return;
        
        const timeMinutes = parseTimeToMinutes(item.time);
        if (timeMinutes === null) return;
        
        // Calculate days until this schedule
        let daysUntil = dayIndex - currentDayIndex;
        if (daysUntil < 0) daysUntil += 7;
        
        // If it's today, check if the time has passed
        if (daysUntil === 0 && timeMinutes <= currentMinutes) {
          daysUntil = 7; // Next week
        }
        
        const minutesFromNow = daysUntil * 24 * 60 + (timeMinutes - currentMinutes);
        
        if (!soonest || minutesFromNow < soonest.minutesFromNow) {
          soonest = {
            streamer,
            time: item.time,
            minutesFromNow,
            dayOffset: daysUntil,
          };
        }
      });
    });

    return soonest;
  }, [streamers, now]);

  if (!nextStream) {
    return null;
  }

  // Calculate countdown
  const totalSeconds = Math.max(0, nextStream.minutesFromNow * 60 - now.getSeconds());
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  const formatUnit = (value: number, unit: string) => (
    <div className="flex flex-col items-center">
      <span className="text-2xl md:text-3xl font-bold tabular-nums text-primary">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {unit}
      </span>
    </div>
  );

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Next Stream</span>
        </div>
        
        <Link
          to={`/streamer/${nextStream.streamer.user_id}`}
          className="flex items-center gap-3 mb-4 group"
        >
          <Avatar className="h-10 w-10 ring-2 ring-primary/30 group-hover:ring-primary transition-all">
            <AvatarImage src={nextStream.streamer.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {getInitials(nextStream.streamer.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate group-hover:text-primary transition-colors">
              {nextStream.streamer.display_name || "Unknown Streamer"}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {nextStream.dayOffset === 0 && "Today"}
                {nextStream.dayOffset === 1 && "Tomorrow"}
                {nextStream.dayOffset > 1 && DAYS_ORDER[(now.getDay() + nextStream.dayOffset) % 7]}
                {" at "}
                {nextStream.time}
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center justify-center gap-3">
          {days > 0 && (
            <>
              {formatUnit(days, days === 1 ? "day" : "days")}
              <span className="text-xl text-muted-foreground/50">:</span>
            </>
          )}
          {formatUnit(hours, hours === 1 ? "hour" : "hrs")}
          <span className="text-xl text-muted-foreground/50">:</span>
          {formatUnit(minutes, minutes === 1 ? "min" : "mins")}
          <span className="text-xl text-muted-foreground/50">:</span>
          {formatUnit(seconds, seconds === 1 ? "sec" : "secs")}
        </div>
      </CardContent>
    </Card>
  );
};
