import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { User, TrendingUp, Coins, Activity, Calendar, Trophy, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/providers/WalletProvider";

interface TradeEntry {
  id: string;
  created_at: string;
  source_type: string;
  volume_amount: number;
  weighted_volume: number;
  collection_id: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  nft_sell: "NFT Sale",
  nft_buy: "NFT Purchase",
  offer: "Offer Made",
  listing: "NFT Listed",
  sticker_purchase: "Sticker Purchase",
  emote_purchase: "Emote Purchase",
  emoji_purchase: "Emoji Purchase",
};

const SOURCE_COLORS: Record<string, string> = {
  nft_sell: "bg-green-500/10 text-green-500 border-green-500/30",
  nft_buy: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  offer: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  listing: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  sticker_purchase: "bg-pink-500/10 text-pink-500 border-pink-500/30",
  emote_purchase: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
  emoji_purchase: "bg-orange-500/10 text-orange-500 border-orange-500/30",
};

export function PersonalVolumeStats() {
  const navigate = useNavigate();
  const { connect } = useWallet();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;

  const { data: volumeData, isLoading } = useQuery({
    queryKey: ['personal-volume-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from('volume_tracking')
        .select('id, created_at, source_type, volume_amount, weighted_volume, collection_id')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TradeEntry[];
    },
    enabled: !!userId,
  });

  const { data: leaderboardRank } = useQuery({
    queryKey: ['personal-leaderboard-rank', userId],
    queryFn: async () => {
      if (!userId) return null;

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from('volume_tracking')
        .select('user_id, weighted_volume')
        .gte('created_at', thirtyDaysAgo)
        .not('user_id', 'is', null);

      if (error) throw error;

      // Aggregate by user
      const userVolumes = new Map<string, number>();
      data?.forEach(entry => {
        if (!entry.user_id) return;
        const existing = userVolumes.get(entry.user_id) || 0;
        userVolumes.set(entry.user_id, existing + Number(entry.weighted_volume));
      });

      // Sort and find user's rank
      const sorted = Array.from(userVolumes.entries())
        .sort((a, b) => b[1] - a[1]);

      const userRank = sorted.findIndex(([id]) => id === userId);
      const userVolume = userVolumes.get(userId) || 0;

      return {
        rank: userRank === -1 ? null : userRank + 1,
        totalTraders: sorted.length,
        volume: userVolume,
      };
    },
    enabled: !!userId,
  });

  const stats = useMemo(() => {
    if (!volumeData || volumeData.length === 0) {
      return {
        totalVolume: 0,
        weightedVolume: 0,
        tradeCount: 0,
        volumeByType: {},
        recentTrades: [],
      };
    }

    const totalVolume = volumeData.reduce((a, b) => a + Number(b.volume_amount), 0);
    const weightedVolume = volumeData.reduce((a, b) => a + Number(b.weighted_volume), 0);

    const volumeByType: Record<string, { count: number; volume: number }> = {};
    volumeData.forEach(entry => {
      if (!volumeByType[entry.source_type]) {
        volumeByType[entry.source_type] = { count: 0, volume: 0 };
      }
      volumeByType[entry.source_type].count++;
      volumeByType[entry.source_type].volume += Number(entry.weighted_volume);
    });

    return {
      totalVolume,
      weightedVolume,
      tradeCount: volumeData.length,
      volumeByType,
      recentTrades: volumeData.slice(0, 5),
    };
  }, [volumeData]);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(2);
  };

  // Not logged in
  if (!session) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center">
          <div className="p-4 rounded-full bg-muted w-fit mx-auto mb-4">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Track Your Trading Volume</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sign in to see your personal trading stats and leaderboard position
          </p>
          <Button onClick={() => connect()}>
            Connect Wallet
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Your Trading Stats</CardTitle>
              <CardDescription>30-day volume tracking</CardDescription>
            </div>
          </div>
          {leaderboardRank?.rank && leaderboardRank.rank <= 10 && (
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1">
              <Trophy className="w-3 h-3" />
              Rank #{leaderboardRank.rank}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Coins className="w-3 h-3" />
              Weighted Volume
            </div>
            <div className="text-xl font-bold text-primary">
              {formatVolume(stats.weightedVolume)}
            </div>
            <div className="text-xs text-muted-foreground">SOL</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Activity className="w-3 h-3" />
              Transactions
            </div>
            <div className="text-xl font-bold">{stats.tradeCount}</div>
            <div className="text-xs text-muted-foreground">trades</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingUp className="w-3 h-3" />
              Rank
            </div>
            <div className="text-xl font-bold">
              {leaderboardRank?.rank ? `#${leaderboardRank.rank}` : '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              of {leaderboardRank?.totalTraders || 0}
            </div>
          </div>
        </div>

        {/* Volume by Type */}
        {Object.keys(stats.volumeByType).length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Volume Breakdown</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.volumeByType)
                .sort((a, b) => b[1].volume - a[1].volume)
                .map(([type, data]) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className={SOURCE_COLORS[type] || 'bg-muted'}
                  >
                    {SOURCE_LABELS[type] || type}: {formatVolume(data.volume)} ({data.count})
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Recent Trades */}
        {stats.recentTrades.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Recent Activity</div>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              {stats.recentTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${SOURCE_COLORS[trade.source_type] || ''}`}
                    >
                      {SOURCE_LABELS[trade.source_type] || trade.source_type}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(trade.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatVolume(Number(trade.weighted_volume))} SOL
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 bg-muted/30 rounded-lg">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">No trading activity yet</p>
            <p className="text-xs text-muted-foreground">
              Start trading to track your volume
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/marketplace')}>
              Browse Marketplace
            </Button>
          </div>
        )}

        {/* Reward Eligibility */}
        {leaderboardRank?.rank && leaderboardRank.rank <= 10 && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3">
            <div className="flex items-center gap-2 text-green-500 text-sm font-medium mb-1">
              <Trophy className="w-4 h-4" />
              Reward Eligible!
            </div>
            <p className="text-xs text-muted-foreground">
              You're in the top 10 and eligible for volume rewards this period.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
