import { Bell, BellOff, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLiveNotifications } from "@/hooks/useLiveNotifications";
import { useNavigate } from "react-router-dom";

export const NotificationBell = () => {
  const { 
    notificationsEnabled, 
    requestPermission, 
    followedStreamersCount, 
    liveStreamersCount,
    liveStreamers 
  } = useLiveNotifications();
  const navigate = useNavigate();

  const handleEnableNotifications = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requestPermission();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${notificationsEnabled ? "text-primary" : "text-muted-foreground"}`}
        >
          {notificationsEnabled ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
          {liveStreamersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center animate-pulse">
              {liveStreamersCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-background border-border">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {!notificationsEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEnableNotifications}
              className="text-xs h-7"
            >
              Enable
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {liveStreamers.length > 0 ? (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <Radio className="h-3 w-3 text-red-500 animate-pulse" />
              Live Now
            </DropdownMenuLabel>
            {liveStreamers.map((streamer) => (
              <DropdownMenuItem
                key={streamer.userId}
                className="cursor-pointer p-3"
                onClick={() => navigate(`/streamer/${streamer.userId}`)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={streamer.avatarUrl || undefined} />
                      <AvatarFallback>
                        {streamer.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {streamer.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {streamer.streamTitle}
                    </p>
                    {streamer.category && (
                      <p className="text-xs text-primary/70 truncate">
                        {streamer.category}
                      </p>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No streamers live right now</p>
            {followedStreamersCount > 0 && (
              <p className="text-xs mt-1">
                Following {followedStreamersCount} streamer{followedStreamersCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
