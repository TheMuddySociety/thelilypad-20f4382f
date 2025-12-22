import { Bell, BellOff, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLiveNotifications } from "@/hooks/useLiveNotifications";

export const NotificationBell = () => {
  const { notificationsEnabled, requestPermission, followedStreamersCount, liveStreamersCount } = useLiveNotifications();

  const handleClick = () => {
    if (!notificationsEnabled) {
      requestPermission();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            className={`relative ${notificationsEnabled ? "text-primary" : "text-muted-foreground"}`}
          >
            {notificationsEnabled ? (
              <Bell className="h-5 w-5" />
            ) : (
              <BellOff className="h-5 w-5" />
            )}
            {/* Live streamers badge - shows red pulsing indicator */}
            {liveStreamersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center animate-pulse">
                {liveStreamersCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {liveStreamersCount > 0 ? (
            <div className="flex items-center gap-1">
              <Radio className="h-3 w-3 text-red-500" />
              <span>{liveStreamersCount} streamer{liveStreamersCount !== 1 ? "s" : ""} live now!</span>
            </div>
          ) : notificationsEnabled ? (
            `Notifications enabled (${followedStreamersCount} followed)`
          ) : (
            "Click to enable live notifications"
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
