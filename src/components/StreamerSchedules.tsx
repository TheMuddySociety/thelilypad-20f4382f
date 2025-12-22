import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";

type StreamerProfile = Tables<"streamer_profiles">;

interface ScheduleItem {
  day: string;
  time: string;
  timezone?: string;
}

interface StreamerSchedulesProps {
  streamers: StreamerProfile[];
}

const DAYS_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const StreamerSchedules = ({ streamers }: StreamerSchedulesProps) => {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get today and next 7 days
  const upcomingSchedules = useMemo(() => {
    const today = new Date();
    const todayDayIndex = today.getDay();
    
    // Build list of next 7 days
    const nextDays = Array.from({ length: 7 }, (_, i) => {
      const dayIndex = (todayDayIndex + i) % 7;
      return {
        dayName: DAYS_ORDER[dayIndex],
        isToday: i === 0,
        isTomorrow: i === 1,
        date: new Date(today.getTime() + i * 24 * 60 * 60 * 1000),
      };
    });

    // Collect schedules for each day
    const schedulesByDay: Record<string, Array<{
      streamer: StreamerProfile;
      time: string;
      timezone?: string;
    }>> = {};

    streamers.forEach((streamer) => {
      if (!streamer.schedule || !Array.isArray(streamer.schedule)) return;
      
      const scheduleItems = streamer.schedule as unknown as ScheduleItem[];
      
      scheduleItems.forEach((item) => {
        if (!item.day || !item.time) return;
        
        const dayKey = item.day;
        if (!schedulesByDay[dayKey]) {
          schedulesByDay[dayKey] = [];
        }
        schedulesByDay[dayKey].push({
          streamer,
          time: item.time,
          timezone: item.timezone,
        });
      });
    });

    // Map to next 7 days with schedule info
    return nextDays
      .map((day) => ({
        ...day,
        schedules: schedulesByDay[day.dayName] || [],
      }))
      .filter((day) => day.schedules.length > 0);
  }, [streamers]);

  if (upcomingSchedules.length === 0) {
    return null;
  }

  const formatDayLabel = (day: { isToday: boolean; isTomorrow: boolean; dayName: string; date: Date }) => {
    if (day.isToday) return "Today";
    if (day.isTomorrow) return "Tomorrow";
    return day.dayName;
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Streams
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingSchedules.slice(0, 4).map((day) => (
          <div key={day.dayName} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={day.isToday ? "default" : "outline"}
                className={day.isToday ? "bg-primary" : ""}
              >
                {formatDayLabel(day)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="space-y-2 pl-2">
              {day.schedules.map((schedule, idx) => (
                <Link
                  key={`${schedule.streamer.user_id}-${idx}`}
                  to={`/streamer/${schedule.streamer.user_id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <Avatar className="h-8 w-8 ring-1 ring-border group-hover:ring-primary/50 transition-all">
                    <AvatarImage src={schedule.streamer.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {getInitials(schedule.streamer.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {schedule.streamer.display_name || "Unknown Streamer"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{schedule.time}</span>
                    {schedule.timezone && (
                      <span className="text-muted-foreground/70">({schedule.timezone})</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        
        {upcomingSchedules.length > 4 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{upcomingSchedules.length - 4} more days with scheduled streams
          </p>
        )}
      </CardContent>
    </Card>
  );
};