import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DonorLeaderboard } from "@/components/DonorLeaderboard";
import { TipButton } from "@/components/TipButton";
import { FollowButton } from "@/components/FollowButton";
import { 
  User, ArrowLeft, Calendar, Clock, CheckCircle,
  Twitter, Youtube, MessageCircle, Instagram, Music2,
  Users, Video, Heart
} from "lucide-react";

interface ScheduleItem {
  day: string;
  time: string;
  timezone?: string;
}

interface StreamerProfileData {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_twitter: string | null;
  social_youtube: string | null;
  social_discord: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  schedule: ScheduleItem[];
  is_verified: boolean;
}

interface StreamerStats {
  followerCount: number;
  totalStreams: number;
  isLive: boolean;
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const StreamerProfile = () => {
  const { streamerId } = useParams<{ streamerId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StreamerProfileData | null>(null);
  const [stats, setStats] = useState<StreamerStats>({ followerCount: 0, totalStreams: 0, isLive: false });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!streamerId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Fetch streamer profile
      const { data: profileData, error: profileError } = await supabase
        .from('streamer_profiles')
        .select('*')
        .eq('user_id', streamerId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Parse schedule JSON safely
      let parsedSchedule: ScheduleItem[] = [];
      if (profileData?.schedule) {
        try {
          const rawSchedule = profileData.schedule as unknown;
          parsedSchedule = Array.isArray(rawSchedule) 
            ? (rawSchedule as ScheduleItem[])
            : [];
        } catch {
          parsedSchedule = [];
        }
      }

      setProfile(profileData ? { ...profileData, schedule: parsedSchedule } : null);

      // Fetch follower count
      const { count: followerCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('streamer_id', streamerId);

      // Fetch stream count
      const { count: streamCount } = await supabase
        .from('streams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', streamerId);

      // Check if live
      const { data: liveStream } = await supabase
        .from('streams')
        .select('id')
        .eq('user_id', streamerId)
        .eq('is_live', true)
        .maybeSingle();

      setStats({
        followerCount: followerCount || 0,
        totalStreams: streamCount || 0,
        isLive: !!liveStream
      });

      setLoading(false);
    };

    fetchProfile();
  }, [streamerId]);

  const socialLinks = [
    { key: 'twitter', icon: Twitter, url: profile?.social_twitter, label: 'Twitter' },
    { key: 'youtube', icon: Youtube, url: profile?.social_youtube, label: 'YouTube' },
    { key: 'discord', icon: MessageCircle, url: profile?.social_discord, label: 'Discord' },
    { key: 'instagram', icon: Instagram, url: profile?.social_instagram, label: 'Instagram' },
    { key: 'tiktok', icon: Music2, url: profile?.social_tiktok, label: 'TikTok' },
  ].filter(link => link.url);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <div className="grid md:grid-cols-3 gap-6">
              <Skeleton className="h-48 rounded-xl md:col-span-2" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Profile Header */}
          <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                  <Avatar className="h-28 w-28 border-4 border-primary/20">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.display_name || 'Streamer'} />
                    ) : (
                      <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
                        <User className="h-12 w-12" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {stats.isLive && (
                    <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white animate-pulse">
                      LIVE
                    </Badge>
                  )}
                </div>
                
                <div className="text-center md:text-left flex-1">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold">
                      {profile?.display_name || streamerId?.slice(0, 8) || 'Unknown Streamer'}
                    </h1>
                    {profile?.is_verified && (
                      <CheckCircle className="h-6 w-6 text-primary fill-primary/20" />
                    )}
                  </div>
                  {profile?.bio && (
                    <p className="text-muted-foreground max-w-xl mb-4">{profile.bio}</p>
                  )}
                  
                  {/* Social Links */}
                  {socialLinks.length > 0 && (
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                      {socialLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <a
                            key={link.key}
                            href={link.url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-full bg-muted/50 hover:bg-primary/20 transition-colors"
                            title={link.label}
                          >
                            <Icon className="h-5 w-5" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Stats & Actions */}
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold">{stats.followerCount}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalStreams}</p>
                      <p className="text-xs text-muted-foreground">Streams</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {streamerId && (
                      <FollowButton 
                        streamerId={streamerId} 
                        onFollowChange={(following) => {
                          setStats(prev => ({
                            ...prev,
                            followerCount: following ? prev.followerCount + 1 : prev.followerCount - 1
                          }));
                        }}
                      />
                    )}
                    {streamerId && (
                      <TipButton 
                        streamerId={streamerId}
                        streamerAddress={streamerId}
                        streamerName={profile?.display_name || 'Streamer'}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Schedule */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Streaming Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.schedule && profile.schedule.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.schedule
                      .sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day))
                      .map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div className="p-2 rounded-full bg-primary/10">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{item.day}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.time} {item.timezone && `(${item.timezone})`}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No schedule set</p>
                    <p className="text-sm">Check back later for streaming times!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Supporters */}
            <div className="md:col-span-1">
              <DonorLeaderboard 
                streamerId={streamerId} 
                limit={5}
                title="Top Supporters"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StreamerProfile;
