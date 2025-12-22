import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, CheckCircle, Heart, Radio, ExternalLink, Calendar, Tag, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { FollowButton } from "@/components/FollowButton";

type StreamerProfile = Tables<"streamer_profiles">;
type StreamerWithStatus = StreamerProfile & { is_live: boolean };

const Following = () => {
  const [followedStreamers, setFollowedStreamers] = useState<StreamerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to real-time updates for streams (live status changes)
    const streamsChannel = supabase
      .channel('following-streams-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streams',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const stream = payload.new as { user_id: string; is_live: boolean };
            setFollowedStreamers((prev) =>
              prev.map((streamer) =>
                streamer.user_id === stream.user_id
                  ? { ...streamer, is_live: stream.is_live }
                  : streamer
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(streamsChannel);
    };
  }, [userId]);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);
    await fetchFollowedStreamers(user.id);
  };

  const fetchFollowedStreamers = async (currentUserId: string) => {
    try {
      // Fetch followed streamer IDs
      const { data: follows, error: followsError } = await supabase
        .from("followers")
        .select("streamer_id")
        .eq("follower_id", currentUserId);

      if (followsError) throw followsError;

      if (!follows || follows.length === 0) {
        setFollowedStreamers([]);
        setLoading(false);
        return;
      }

      const streamerIds = follows.map((f) => f.streamer_id);

      // Fetch streamer profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("streamer_profiles")
        .select("*")
        .in("user_id", streamerIds);

      if (profilesError) throw profilesError;

      // Fetch live streams
      const { data: liveStreams, error: liveError } = await supabase
        .from("streams")
        .select("user_id")
        .eq("is_live", true)
        .in("user_id", streamerIds);

      if (liveError) throw liveError;

      const liveStreamersSet = new Set(liveStreams?.map((s) => s.user_id) || []);

      const streamersWithStatus: StreamerWithStatus[] = (profiles || []).map((profile) => ({
        ...profile,
        is_live: liveStreamersSet.has(profile.user_id),
      }));

      // Sort: live streamers first
      streamersWithStatus.sort((a, b) => {
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        return (a.display_name || "").localeCompare(b.display_name || "");
      });

      setFollowedStreamers(streamersWithStatus);
    } catch (error) {
      console.error("Error fetching followed streamers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = () => {
    if (userId) {
      fetchFollowedStreamers(userId);
    }
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

  const getSocialCount = (streamer: StreamerProfile) => {
    let count = 0;
    if (streamer.social_twitter) count++;
    if (streamer.social_youtube) count++;
    if (streamer.social_discord) count++;
    if (streamer.social_instagram) count++;
    if (streamer.social_tiktok) count++;
    return count;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Following
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Stay updated with your favorite streamers and never miss when they go live
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 mb-6 text-muted-foreground">
          <Heart className="h-4 w-4" />
          <span>
            {followedStreamers.length} streamer{followedStreamers.length !== 1 ? "s" : ""} followed
          </span>
          {followedStreamers.filter((s) => s.is_live).length > 0 && (
            <>
              <span className="text-border">•</span>
              <Radio className="h-4 w-4 text-red-500" />
              <span className="text-red-500">
                {followedStreamers.filter((s) => s.is_live).length} live now
              </span>
            </>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : followedStreamers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No streamers followed yet</h3>
            <p className="text-muted-foreground mb-6">
              Discover talented creators and follow them to see their updates here
            </p>
            <Link to="/streamers">
              <Button variant="default">
                Explore Streamers
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {followedStreamers.map((streamer, index) => (
              <motion.div
                key={streamer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/streamer/${streamer.user_id}`}>
                  <div className="group bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        <Avatar className={`h-16 w-16 ring-2 ${streamer.is_live ? 'ring-red-500' : 'ring-border'} group-hover:ring-primary/50 transition-all`}>
                          <AvatarImage src={streamer.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-lg">
                            {getInitials(streamer.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        {streamer.is_live && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase animate-pulse">
                            Live
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg truncate">
                            {streamer.display_name || "Anonymous"}
                          </h3>
                          {streamer.is_verified && (
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(streamer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <FollowButton 
                        streamerId={streamer.user_id} 
                        variant="compact" 
                        onFollowChange={handleUnfollow}
                      />
                    </div>

                    {/* Bio */}
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4 min-h-[3.75rem]">
                      {streamer.bio || "No bio yet"}
                    </p>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-2">
                      {streamer.is_live && (
                        <Badge variant="destructive" className="bg-red-500 animate-pulse">
                          <Radio className="h-3 w-3 mr-1" />
                          Live Now
                        </Badge>
                      )}
                      {streamer.is_verified && (
                        <Badge variant="default" className="bg-primary/20 text-primary border-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {getSocialCount(streamer) > 0 && (
                        <Badge variant="secondary">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {getSocialCount(streamer)} Social Link{getSocialCount(streamer) !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {streamer.schedule && Array.isArray(streamer.schedule) && streamer.schedule.length > 0 && (
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          Has Schedule
                        </Badge>
                      )}
                      {Array.isArray(streamer.categories) && streamer.categories.slice(0, 2).map((category) => (
                        <Badge key={category} variant="outline" className="bg-accent/10 border-accent/30 text-accent">
                          <Tag className="h-3 w-3 mr-1" />
                          {category}
                        </Badge>
                      ))}
                    </div>

                    {/* View Profile Button */}
                    <Button
                      variant="ghost"
                      className="w-full mt-4 group-hover:bg-primary/10 group-hover:text-primary"
                    >
                      View Profile
                    </Button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Following;
