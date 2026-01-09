import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, TrendingUp, Crown, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  user_id: string;
  total_volume: number;
  total_weighted_volume: number;
  trade_count: number;
  display_name?: string | null;
  avatar_url?: string | null;
}

export function VolumeLeaderboard() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['volume-leaderboard'],
    queryFn: async () => {
      // Get volume data aggregated by user for the current period
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('volume_tracking')
        .select('user_id, volume_amount, weighted_volume')
        .gte('created_at', thirtyDaysAgo)
        .not('user_id', 'is', null);
      
      if (error) throw error;
      
      // Aggregate by user
      const userVolumes = new Map<string, { total_volume: number; total_weighted_volume: number; trade_count: number }>();
      
      data?.forEach(entry => {
        if (!entry.user_id) return;
        
        const existing = userVolumes.get(entry.user_id) || { 
          total_volume: 0, 
          total_weighted_volume: 0, 
          trade_count: 0 
        };
        
        userVolumes.set(entry.user_id, {
          total_volume: existing.total_volume + Number(entry.volume_amount),
          total_weighted_volume: existing.total_weighted_volume + Number(entry.weighted_volume),
          trade_count: existing.trade_count + 1,
        });
      });
      
      // Convert to array and sort by weighted volume
      const sorted = Array.from(userVolumes.entries())
        .map(([user_id, stats]) => ({ user_id, ...stats }))
        .sort((a, b) => b.total_weighted_volume - a.total_weighted_volume)
        .slice(0, 10);
      
      // Fetch user profiles for display names
      if (sorted.length > 0) {
        const userIds = sorted.map(e => e.user_id);
        const { data: profiles } = await supabase
          .from('streamer_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        
        // Create a map of user profiles
        const profileMap = new Map(
          profiles?.map(p => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }]) || []
        );
        
        // Merge profile data into leaderboard entries
        return sorted.map(entry => ({
          ...entry,
          display_name: profileMap.get(entry.user_id)?.display_name,
          avatar_url: profileMap.get(entry.user_id)?.avatar_url,
        })) as LeaderboardEntry[];
      }
      
      return sorted as LeaderboardEntry[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-500";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30 text-gray-400";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30 text-amber-600";
      default:
        return "bg-muted/50 border-border text-muted-foreground";
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.display_name) return entry.display_name;
    // Fallback to truncated user ID
    if (entry.user_id.length === 36 && entry.user_id.includes('-')) {
      return `User ${entry.user_id.slice(0, 8)}...`;
    }
    return `${entry.user_id.slice(0, 6)}...${entry.user_id.slice(-4)}`;
  };

  const getInitials = (entry: LeaderboardEntry) => {
    if (entry.display_name) {
      return entry.display_name.slice(0, 2).toUpperCase();
    }
    return entry.user_id.slice(0, 2).toUpperCase();
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Volume Leaderboard</CardTitle>
              <CardDescription>Top traders by 30-day weighted volume</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="w-3 h-3" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;
              
              return (
                <div 
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    isTopThree 
                      ? 'bg-gradient-to-r from-primary/5 to-transparent border border-primary/10' 
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRankBadge(rank)}`}>
                    {getRankIcon(rank)}
                  </div>
                  
                  {/* User Info with Avatar */}
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarImage src={entry.avatar_url || undefined} alt={getDisplayName(entry)} />
                    <AvatarFallback className="text-xs bg-muted">
                      {getInitials(entry)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {getDisplayName(entry)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.trade_count} trade{entry.trade_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {/* Volume */}
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {formatVolume(entry.total_weighted_volume)} SOL
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Raw: {formatVolume(entry.total_volume)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="p-4 rounded-full bg-muted w-fit mx-auto mb-4">
              <Trophy className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No Trading Volume Yet</h3>
            <p className="text-sm text-muted-foreground">
              Be the first to trade and claim the top spot!
            </p>
          </div>
        )}
        
        {/* Legend */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Weighted volume includes bonuses for trading buyback program collections
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
