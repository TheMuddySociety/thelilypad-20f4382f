import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, Trophy, ArrowUp, Check, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const REWARD_PERCENTAGES = [25, 15, 10, 8, 7, 6, 5, 4, 3, 2];

export function VolumeSimulator() {
  const [yourVolume, setYourVolume] = useState<number>(0);

  const { data: leaderboardVolumes, isLoading } = useQuery({
    queryKey: ['volume-simulator-data'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
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
      
      // Sort and get top 10 volumes
      const sorted = Array.from(userVolumes.values())
        .sort((a, b) => b - a)
        .slice(0, 10);
      
      // Pad to 10 entries if less
      while (sorted.length < 10) {
        sorted.push(0);
      }
      
      return sorted;
    },
    refetchInterval: 60000,
  });

  const rankData = useMemo(() => {
    if (!leaderboardVolumes) return [];

    return leaderboardVolumes.map((currentVolume, index) => {
      const rank = index + 1;
      const volumeNeeded = Math.max(0, currentVolume - yourVolume + 0.01);
      const wouldRank = yourVolume > currentVolume;
      const rewardPercent = REWARD_PERCENTAGES[index];

      return {
        rank,
        currentVolume,
        volumeNeeded,
        wouldRank,
        rewardPercent,
      };
    });
  }, [leaderboardVolumes, yourVolume]);

  const yourCurrentRank = useMemo(() => {
    if (!leaderboardVolumes || yourVolume === 0) return null;
    const rank = leaderboardVolumes.findIndex(v => yourVolume > v);
    return rank === -1 ? 11 : rank + 1;
  }, [leaderboardVolumes, yourVolume]);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setYourVolume(Math.max(0, value));
  };

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
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Volume Simulator</CardTitle>
            <CardDescription>See how much volume you need to reach each rank</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Your Volume Input */}
        <div className="space-y-2">
          <Label htmlFor="your-volume" className="flex items-center gap-1">
            Your Current Volume
            <span className="text-muted-foreground text-xs">(weighted SOL)</span>
          </Label>
          <Input
            id="your-volume"
            type="number"
            value={yourVolume}
            onChange={handleVolumeChange}
            placeholder="Enter your volume"
            min={0}
            step={10}
          />
          {yourCurrentRank && yourCurrentRank <= 10 && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <Trophy className="w-4 h-4" />
              You would currently rank #{yourCurrentRank}!
            </div>
          )}
        </div>

        {/* Rank Requirements */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium mb-2">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              Volume Goals
            </span>
            <span className="text-xs text-muted-foreground">Based on current standings</span>
          </div>

          {rankData.map((data) => (
            <div
              key={data.rank}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                data.wouldRank
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              {/* Rank Badge */}
              <Badge
                variant={data.rank <= 3 ? "default" : "secondary"}
                className={`w-8 justify-center ${
                  data.rank === 1 ? 'bg-amber-500 hover:bg-amber-500' :
                  data.rank === 2 ? 'bg-slate-400 hover:bg-slate-400' :
                  data.rank === 3 ? 'bg-amber-700 hover:bg-amber-700' : ''
                }`}
              >
                #{data.rank}
              </Badge>

              {/* Current Volume at this rank */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {formatVolume(data.currentVolume)} SOL
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.rewardPercent}% reward share
                </div>
              </div>

              {/* Status/Volume Needed */}
              <div className="text-right">
                {data.wouldRank ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Achieved</span>
                  </div>
                ) : data.currentVolume === 0 ? (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Minus className="w-4 h-4" />
                    <span className="text-sm">Open</span>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500">
                      <ArrowUp className="w-3 h-3" />
                      <span className="text-sm font-medium">
                        +{formatVolume(data.volumeNeeded)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">needed</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {leaderboardVolumes && leaderboardVolumes[0] > 0 && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Top Volume</div>
                <div className="font-semibold">{formatVolume(leaderboardVolumes[0])} SOL</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">10th Place</div>
                <div className="font-semibold">{formatVolume(leaderboardVolumes[9])} SOL</div>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Volume data updates every minute • 30-day rolling period
        </p>
      </CardContent>
    </Card>
  );
}
