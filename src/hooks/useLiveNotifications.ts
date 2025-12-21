import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FollowedStreamer {
  streamer_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export const useLiveNotifications = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [followedStreamers, setFollowedStreamers] = useState<FollowedStreamer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Check notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
      return false;
    }

    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    setNotificationsEnabled(granted);

    if (granted) {
      toast({
        title: "Notifications enabled",
        description: "You'll be notified when followed streamers go live.",
      });
    } else {
      toast({
        title: "Notifications blocked",
        description: "Enable notifications in your browser settings.",
        variant: "destructive",
      });
    }

    return granted;
  }, [toast]);

  // Fetch followed streamers
  useEffect(() => {
    const fetchFollowedStreamers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setUserId(null);
        setFollowedStreamers([]);
        return;
      }

      setUserId(session.user.id);

      // Get all streamers the user follows
      const { data: follows, error: followsError } = await supabase
        .from("followers")
        .select("streamer_id")
        .eq("follower_id", session.user.id);

      if (followsError) {
        console.error("Error fetching follows:", followsError);
        return;
      }

      if (!follows || follows.length === 0) {
        setFollowedStreamers([]);
        return;
      }

      const streamerIds = follows.map(f => f.streamer_id);

      // Get streamer profiles for display names
      const { data: profiles, error: profilesError } = await supabase
        .from("streamer_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", streamerIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return;
      }

      setFollowedStreamers(
        (profiles || []).map(p => ({
          streamer_id: p.user_id,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        }))
      );
    };

    fetchFollowedStreamers();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchFollowedStreamers();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show notification
  const showNotification = useCallback((streamerName: string, avatarUrl: string | null) => {
    // Show in-app toast
    toast({
      title: "🔴 Streamer is Live!",
      description: `${streamerName} just went live!`,
    });

    // Show browser notification if enabled
    if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(`${streamerName} is now live!`, {
        body: "Click to watch the stream",
        icon: avatarUrl || "/placeholder.svg",
        tag: `live-${streamerName}`,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, [notificationsEnabled, toast]);

  // Subscribe to stream changes for followed streamers
  useEffect(() => {
    if (!userId || followedStreamers.length === 0) return;

    const streamerIds = followedStreamers.map(s => s.streamer_id);

    console.log("Setting up live notifications for streamers:", streamerIds);

    const channel = supabase
      .channel("live-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "streams",
        },
        (payload) => {
          const stream = payload.new as { user_id: string; is_live: boolean };
          const oldStream = payload.old as { is_live: boolean };

          // Check if this is a followed streamer going live (was not live, now is live)
          if (
            streamerIds.includes(stream.user_id) &&
            stream.is_live === true &&
            oldStream.is_live === false
          ) {
            const streamer = followedStreamers.find(s => s.streamer_id === stream.user_id);
            if (streamer) {
              console.log("Followed streamer went live:", streamer.display_name);
              showNotification(streamer.display_name || "A streamer you follow", streamer.avatar_url);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "streams",
        },
        (payload) => {
          const stream = payload.new as { user_id: string; is_live: boolean };

          // Check if this is a new live stream from a followed streamer
          if (streamerIds.includes(stream.user_id) && stream.is_live === true) {
            const streamer = followedStreamers.find(s => s.streamer_id === stream.user_id);
            if (streamer) {
              console.log("Followed streamer started new live stream:", streamer.display_name);
              showNotification(streamer.display_name || "A streamer you follow", streamer.avatar_url);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, followedStreamers, showNotification]);

  return {
    notificationsEnabled,
    requestPermission,
    followedStreamersCount: followedStreamers.length,
  };
};
