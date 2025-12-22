import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FollowedStreamer {
  streamer_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface LiveStreamer {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  streamTitle: string;
  category: string | null;
}

const DISMISSED_NOTIFICATIONS_KEY = "dismissed_live_notifications";

const getDismissedNotifications = (): Set<string> => {
  try {
    const stored = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (e) {
    console.error("Error reading dismissed notifications:", e);
  }
  return new Set();
};

const saveDismissedNotifications = (dismissed: Set<string>) => {
  try {
    localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify([...dismissed]));
  } catch (e) {
    console.error("Error saving dismissed notifications:", e);
  }
};

export const useLiveNotifications = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [followedStreamers, setFollowedStreamers] = useState<FollowedStreamer[]>([]);
  const [liveStreamersCount, setLiveStreamersCount] = useState(0);
  const [liveStreamers, setLiveStreamers] = useState<LiveStreamer[]>([]);
  const [dismissedStreamers, setDismissedStreamers] = useState<Set<string>>(() => getDismissedNotifications());
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

  // Dismiss a live notification
  const dismissNotification = useCallback((streamerId: string) => {
    setDismissedStreamers(prev => {
      const next = new Set(prev);
      next.add(streamerId);
      saveDismissedNotifications(next);
      return next;
    });
  }, []);

  // Clear dismissed when streamer goes offline (handled in realtime subscription)
  const clearDismissedForStreamer = useCallback((streamerId: string) => {
    setDismissedStreamers(prev => {
      if (!prev.has(streamerId)) return prev;
      const next = new Set(prev);
      next.delete(streamerId);
      saveDismissedNotifications(next);
      return next;
    });
  }, []);

  // Fetch followed streamers and their live status
  const fetchFollowedStreamersAndLiveStatus = useCallback(async (currentUserId: string) => {
    // Get all streamers the user follows
    const { data: follows, error: followsError } = await supabase
      .from("followers")
      .select("streamer_id")
      .eq("follower_id", currentUserId);

    if (followsError) {
      console.error("Error fetching follows:", followsError);
      return;
    }

    if (!follows || follows.length === 0) {
      setFollowedStreamers([]);
      setLiveStreamersCount(0);
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

    // Fetch live streams for followed streamers
    const { data: liveStreams, error: liveError } = await supabase
      .from("streams")
      .select("user_id, title, category")
      .eq("is_live", true)
      .in("user_id", streamerIds);

    if (!liveError && liveStreams) {
      setLiveStreamersCount(liveStreams.length);
      
      // Build live streamers list with profile info
      const liveStreamersList: LiveStreamer[] = liveStreams.map(stream => {
        const profile = (profiles || []).find(p => p.user_id === stream.user_id);
        return {
          userId: stream.user_id,
          displayName: profile?.display_name || "Unknown Streamer",
          avatarUrl: profile?.avatar_url || null,
          streamTitle: stream.title,
          category: stream.category,
        };
      });
      setLiveStreamers(liveStreamersList);
    }
  }, []);

  // Fetch followed streamers
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setUserId(null);
        setFollowedStreamers([]);
        setLiveStreamersCount(0);
        return;
      }

      setUserId(session.user.id);
      await fetchFollowedStreamersAndLiveStatus(session.user.id);
    };

    fetchData();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        await fetchFollowedStreamersAndLiveStatus(session.user.id);
      } else {
        setUserId(null);
        setFollowedStreamers([]);
        setLiveStreamersCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchFollowedStreamersAndLiveStatus]);

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

          // Check if this is a followed streamer
          if (streamerIds.includes(stream.user_id)) {
            const fullPayload = payload.new as { user_id: string; is_live: boolean; title?: string; category?: string | null };
            // Update live count when stream status changes
            if (stream.is_live && !oldStream.is_live) {
              // Streamer went live
              setLiveStreamersCount(prev => prev + 1);
              const streamer = followedStreamers.find(s => s.streamer_id === stream.user_id);
              if (streamer) {
                console.log("Followed streamer went live:", streamer.display_name);
                showNotification(streamer.display_name || "A streamer you follow", streamer.avatar_url);
                // Add to live streamers list
                setLiveStreamers(prev => [...prev, {
                  userId: stream.user_id,
                  displayName: streamer.display_name || "Unknown Streamer",
                  avatarUrl: streamer.avatar_url,
                  streamTitle: fullPayload.title || "Untitled Stream",
                  category: fullPayload.category || null,
                }]);
              }
            } else if (!stream.is_live && oldStream.is_live) {
              // Streamer went offline - clear dismissed state
              clearDismissedForStreamer(stream.user_id);
              setLiveStreamersCount(prev => Math.max(0, prev - 1));
              setLiveStreamers(prev => prev.filter(s => s.userId !== stream.user_id));
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
          const fullPayload = payload.new as { user_id: string; is_live: boolean; title?: string; category?: string | null };
          if (streamerIds.includes(stream.user_id) && stream.is_live === true) {
            setLiveStreamersCount(prev => prev + 1);
            const streamer = followedStreamers.find(s => s.streamer_id === stream.user_id);
            if (streamer) {
              console.log("Followed streamer started new live stream:", streamer.display_name);
              showNotification(streamer.display_name || "A streamer you follow", streamer.avatar_url);
              // Add to live streamers list
              setLiveStreamers(prev => [...prev, {
                userId: stream.user_id,
                displayName: streamer.display_name || "Unknown Streamer",
                avatarUrl: streamer.avatar_url,
                streamTitle: fullPayload.title || "Untitled Stream",
                category: fullPayload.category || null,
              }]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, followedStreamers, showNotification, clearDismissedForStreamer]);

  // Filter out dismissed streamers for the visible list
  const visibleLiveStreamers = liveStreamers.filter(s => !dismissedStreamers.has(s.userId));
  const unreadCount = visibleLiveStreamers.length;

  return {
    notificationsEnabled,
    requestPermission,
    followedStreamersCount: followedStreamers.length,
    liveStreamersCount,
    liveStreamers: visibleLiveStreamers,
    unreadCount,
    dismissNotification,
  };
};
