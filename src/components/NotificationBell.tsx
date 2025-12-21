import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLiveNotifications } from "@/hooks/useLiveNotifications";

export const NotificationBell = () => {
  const { notificationsEnabled, requestPermission, followedStreamersCount } = useLiveNotifications();

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
            {notificationsEnabled && followedStreamersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {followedStreamersCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {notificationsEnabled
            ? `Notifications enabled (${followedStreamersCount} followed)`
            : "Click to enable live notifications"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
