import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import { motion } from "framer-motion";
import { 
  User, ArrowLeft, Calendar, Clock, CheckCircle,
  Twitter, Youtube, MessageCircle, Instagram, Music2,
  Users, Video, Eye, Sparkles, ExternalLink, Play, ImageIcon
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
  categories: string[] | null;
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
  totalViews: number;
  isLive: boolean;
  currentStreamTitle?: string;
}

interface RecentStream {
  id: string;
  title: string;
  category: string | null;
  thumbnail_url: string | null;
  total_views: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const socialConfig = {
  twitter: { icon: Twitter, label: 'Twitter', color: 'hover:text-sky-500', bgHover: 'hover:bg-sky-500/10' },
  youtube: { icon: Youtube, label: 'YouTube', color: 'hover:text-red-500', bgHover: 'hover:bg-red-500/10' },
  discord: { icon: MessageCircle, label: 'Discord', color: 'hover:text-indigo-500', bgHover: 'hover:bg-indigo-500/10' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'hover:text-pink-500', bgHover: 'hover:bg-pink-500/10' },
  tiktok: { icon: Music2, label: 'TikTok', color: 'hover:text-foreground', bgHover: 'hover:bg-foreground/10' },
};

const StreamerProfile = () => {
  const { streamerId } = useParams<{ streamerId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StreamerProfileData | null>(null);
  const [stats, setStats] = useState<StreamerStats>({ followerCount: 0, totalStreams: 0, totalViews: 0, isLive: false });
  const [recentStreams, setRecentStreams] = useState<RecentStream[]>([]);

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

      // Fetch streams with views
      const { data: streams } = await supabase
        .from('streams')
        .select('id, title, category, thumbnail_url, total_views, is_live, started_at, ended_at, duration_seconds')
        .eq('user_id', streamerId)
        .order('started_at', { ascending: false });

      const totalStreams = streams?.length || 0;
      const totalViews = streams?.reduce((sum, s) => sum + (s.total_views || 0), 0) || 0;
      const liveStream = streams?.find(s => s.is_live);
      
      // Get past broadcasts (not live, limit to 6)
      const pastStreams = streams?.filter(s => !s.is_live).slice(0, 6) || [];
      setRecentStreams(pastStreams);

      setStats({
        followerCount: followerCount || 0,
        totalStreams,
        totalViews,
        isLive: !!liveStream,
        currentStreamTitle: liveStream?.title
      });

      setLoading(false);
    };

    fetchProfile();
  }, [streamerId]);

  const socialLinks = [
    { key: 'twitter' as const, url: profile?.social_twitter },
    { key: 'youtube' as const, url: profile?.social_youtube },
    { key: 'discord' as const, url: profile?.social_discord },
    { key: 'instagram' as const, url: profile?.social_instagram },
    { key: 'tiktok' as const, url: profile?.social_tiktok },
  ].filter(link => link.url);

  const statItems = [
    { icon: Users, label: 'Followers', value: stats.followerCount, color: 'text-primary' },
    { icon: Video, label: 'Streams', value: stats.totalStreams, color: 'text-blue-500' },
    { icon: Eye, label: 'Total Views', value: stats.totalViews, color: 'text-emerald-500' },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-5xl mx-auto space-y-6">
            <Skeleton className="h-80 w-full rounded-2xl" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <Skeleton className="h-64 rounded-xl lg:col-span-2" />
              <Skeleton className="h-64 rounded-xl" />
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
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="gap-2 hover:bg-muted/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </motion.div>

          {/* Hero Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden relative">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              
              <CardContent className="p-8 md:p-10 relative">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  {/* Avatar Section */}
                  <div className="relative flex-shrink-0">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/50 rounded-full blur-xl opacity-30 scale-110" />
                      <Avatar className="h-36 w-36 border-4 border-background shadow-2xl relative">
                        {profile?.avatar_url ? (
                          <AvatarImage src={profile.avatar_url} alt={profile.display_name || 'Streamer'} className="object-cover" />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-4xl font-bold">
                            <User className="h-16 w-16" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    {stats.isLive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                      >
                        <Badge className="bg-red-500 text-white px-4 py-1 text-sm font-semibold shadow-lg animate-pulse">
                          <span className="w-2 h-2 bg-white rounded-full mr-2 inline-block animate-pulse" />
                          LIVE NOW
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Profile Info */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                        {profile?.display_name || streamerId?.slice(0, 8) || 'Unknown Streamer'}
                      </h1>
                      {profile?.is_verified && (
                        <div className="p-1 rounded-full bg-primary/20">
                          <CheckCircle className="h-6 w-6 text-primary" />
                        </div>
                      )}
                    </div>
                    
                    {profile?.bio && (
                      <p className="text-muted-foreground text-lg max-w-2xl mb-4 leading-relaxed">
                        {profile.bio}
                      </p>
                    )}

                    {/* Categories */}
                    {profile?.categories && profile.categories.length > 0 && (
                      <div className="flex items-center justify-center lg:justify-start gap-2 mb-5 flex-wrap">
                        {profile.categories.map((category, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            {category}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Social Links */}
                    {socialLinks.length > 0 && (
                      <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
                        {socialLinks.map((link) => {
                          const config = socialConfig[link.key];
                          const Icon = config.icon;
                          return (
                            <a
                              key={link.key}
                              href={link.url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-3 rounded-xl bg-muted/30 border border-border/50 transition-all duration-200 ${config.color} ${config.bgHover} hover:scale-105 hover:shadow-lg group`}
                              title={config.label}
                            >
                              <Icon className="h-5 w-5" />
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center lg:justify-start gap-3">
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
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-4"
          >
            {statItems.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                >
                  <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 group">
                    <CardContent className="p-4 md:p-6 text-center">
                      <div className={`inline-flex p-3 rounded-xl bg-muted/50 ${stat.color} mb-3 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-5 w-5 md:h-6 md:w-6" />
                      </div>
                      <p className="text-2xl md:text-3xl font-bold mb-1">{formatNumber(stat.value)}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Live Stream Banner */}
          {stats.isLive && stats.currentStreamTitle && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-red-500/30 bg-gradient-to-r from-red-500/10 via-card to-card overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-red-500/20 animate-pulse">
                        <Video className="h-6 w-6 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm text-red-400 font-medium mb-1">Currently Streaming</p>
                        <p className="text-lg font-semibold">{stats.currentStreamTitle}</p>
                      </div>
                    </div>
                    <Link to="/streams">
                      <Button variant="outline" className="border-red-500/30 hover:bg-red-500/10">
                        Watch Now
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="lg:col-span-2"
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
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
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.05 }}
                            className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                          >
                            <div className="p-2.5 rounded-xl bg-primary/10">
                              <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{item.day}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.time} {item.timezone && <span className="text-xs opacity-70">({item.timezone})</span>}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="p-4 rounded-full bg-muted/30 w-fit mx-auto mb-4">
                        <Calendar className="h-10 w-10 opacity-50" />
                      </div>
                      <p className="font-medium mb-1">No schedule set</p>
                      <p className="text-sm">Check back later for streaming times!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Supporters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <DonorLeaderboard 
                streamerId={streamerId} 
                limit={5}
                title="Top Supporters"
              />
            </motion.div>
          </div>

          {/* Recent Streams */}
          {recentStreams.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Play className="h-5 w-5 text-primary" />
                    Recent Broadcasts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentStreams.map((stream, index) => (
                      <motion.div
                        key={stream.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="group"
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted/50 border border-border/50">
                          {stream.thumbnail_url ? (
                            <img 
                              src={stream.thumbnail_url} 
                              alt={stream.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                          )}
                          
                          {/* Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          {/* Duration badge */}
                          {stream.duration_seconds && (
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-medium">
                              {formatDuration(stream.duration_seconds)}
                            </div>
                          )}
                          
                          {/* Play icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-3 rounded-full bg-primary/90 text-primary-foreground">
                              <Play className="h-6 w-6 fill-current" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 space-y-1">
                          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                            {stream.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {formatNumber(stream.total_views)} views
                            </span>
                            <span>{formatDate(stream.started_at)}</span>
                          </div>
                          {stream.category && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {stream.category}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StreamerProfile;
