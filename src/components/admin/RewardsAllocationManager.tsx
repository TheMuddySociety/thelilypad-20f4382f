import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  Coins,
  Users,
  Calendar,
  Gift,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";

interface TraderVolume {
  user_id: string;
  total_volume: number;
  total_weighted_volume: number;
  trade_count: number;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface RewardTier {
  rank: number;
  percentage: number;
}

const DEFAULT_REWARD_TIERS: RewardTier[] = [
  { rank: 1, percentage: 30 },
  { rank: 2, percentage: 20 },
  { rank: 3, percentage: 15 },
  { rank: 4, percentage: 10 },
  { rank: 5, percentage: 8 },
  { rank: 6, percentage: 6 },
  { rank: 7, percentage: 5 },
  { rank: 8, percentage: 3 },
  { rank: 9, percentage: 2 },
  { rank: 10, percentage: 1 },
];

type PeriodType = 'last_week' | 'last_month' | 'custom';

export function RewardsAllocationManager() {
  const queryClient = useQueryClient();
  const [periodType, setPeriodType] = useState<PeriodType>('last_week');
  const [totalRewardPool, setTotalRewardPool] = useState<string>("100");
  const [isAllocating, setIsAllocating] = useState(false);

  const getPeriodDates = () => {
    const now = new Date();
    switch (periodType) {
      case 'last_week':
        const lastWeekStart = startOfWeek(subWeeks(now, 1));
        const lastWeekEnd = endOfWeek(subWeeks(now, 1));
        return { start: lastWeekStart, end: lastWeekEnd };
      case 'last_month':
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        return { start: lastMonthStart, end: lastMonthEnd };
      default:
        return { start: subDays(now, 7), end: now };
    }
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  // Fetch top traders for the selected period
  const { data: topTraders, isLoading: isLoadingTraders } = useQuery({
    queryKey: ['admin-top-traders', periodType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('volume_tracking')
        .select('user_id, volume_amount, weighted_volume')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString())
        .not('user_id', 'is', null);

      if (error) throw error;

      // Aggregate by user
      const userVolumes = new Map<string, { total_volume: number; total_weighted_volume: number; trade_count: number }>();

      data?.forEach(record => {
        if (!record.user_id) return;
        const existing = userVolumes.get(record.user_id) || { total_volume: 0, total_weighted_volume: 0, trade_count: 0 };
        userVolumes.set(record.user_id, {
          total_volume: existing.total_volume + Number(record.volume_amount),
          total_weighted_volume: existing.total_weighted_volume + Number(record.weighted_volume),
          trade_count: existing.trade_count + 1,
        });
      });

      const sorted = Array.from(userVolumes.entries())
        .map(([user_id, stats]) => ({ user_id, ...stats }))
        .sort((a, b) => b.total_weighted_volume - a.total_weighted_volume)
        .slice(0, 10);

      // Fetch profiles
      if (sorted.length > 0) {
        const userIds = sorted.map(e => e.user_id);
        const { data: profiles } = await supabase
          .from('streamer_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(
          profiles?.map(p => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }]) || []
        );

        return sorted.map(entry => ({
          ...entry,
          display_name: profileMap.get(entry.user_id)?.display_name,
          avatar_url: profileMap.get(entry.user_id)?.avatar_url,
        })) as TraderVolume[];
      }

      return sorted as TraderVolume[];
    },
  });

  // Check for existing allocations for this period
  const { data: existingAllocations } = useQuery({
    queryKey: ['existing-allocations', periodStart.toISOString(), periodEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('volume_rewards')
        .select('id, user_id, rank, reward_amount')
        .eq('reward_period_start', periodStart.toISOString())
        .eq('reward_period_end', periodEnd.toISOString());

      if (error) throw error;
      return data;
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async () => {
      if (!topTraders || topTraders.length === 0) {
        throw new Error('No traders to allocate rewards to');
      }

      const pool = parseFloat(totalRewardPool);
      if (isNaN(pool) || pool <= 0) {
        throw new Error('Invalid reward pool amount');
      }

      // Calculate rewards based on tiers
      const rewards = topTraders.map((trader, index) => {
        const tier = DEFAULT_REWARD_TIERS[index];
        const rewardAmount = tier ? (pool * tier.percentage) / 100 : 0;

        return {
          user_id: trader.user_id,
          reward_period_start: periodStart.toISOString(),
          reward_period_end: periodEnd.toISOString(),
          rank: index + 1,
          weighted_volume: trader.total_weighted_volume,
          reward_amount: rewardAmount,
          is_claimed: false,
        };
      }).filter(r => r.reward_amount > 0);

      // Insert rewards
      const { error } = await supabase
        .from('volume_rewards')
        .upsert(rewards, {
          onConflict: 'user_id,reward_period_start,reward_period_end',
          ignoreDuplicates: false
        });

      if (error) throw error;
      return rewards;
    },
    onSuccess: (rewards) => {
      queryClient.invalidateQueries({ queryKey: ['existing-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['volume-rewards'] });
      toast({
        title: "Rewards Allocated!",
        description: `Successfully allocated rewards to ${rewards.length} traders.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Allocation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsAllocating(false);
    },
  });

  const handleAllocate = () => {
    setIsAllocating(true);
    allocateMutation.mutate();
  };

  const getDisplayName = (trader: TraderVolume) => {
    if (trader.display_name) return trader.display_name;
    return `${trader.user_id.slice(0, 8)}...`;
  };

  const calculateReward = (rank: number) => {
    const pool = parseFloat(totalRewardPool) || 0;
    const tier = DEFAULT_REWARD_TIERS[rank - 1];
    return tier ? (pool * tier.percentage) / 100 : 0;
  };

  const hasExistingAllocations = existingAllocations && existingAllocations.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Rewards Allocation
        </CardTitle>
        <CardDescription>
          Allocate SOL rewards to top volume traders for a specific period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Reward Period</Label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {format(periodStart, 'MMM d, yyyy')} - {format(periodEnd, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Total Reward Pool (SOL)</Label>
            <Input
              type="number"
              value={totalRewardPool}
              onChange={(e) => setTotalRewardPool(e.target.value)}
              min="0"
              step="10"
            />
          </div>
        </div>

        {/* Existing Allocation Warning */}
        {hasExistingAllocations && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              Rewards have already been allocated for this period ({existingAllocations.length} traders).
              Allocating again will update existing rewards.
            </p>
          </div>
        )}

        {/* Top Traders Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Top Traders ({periodType === 'last_week' ? 'Weekly' : 'Monthly'})
            </h4>
            <Badge variant="outline">
              <Coins className="w-3 h-3 mr-1" />
              {totalRewardPool} SOL Pool
            </Badge>
          </div>

          {isLoadingTraders ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : topTraders && topTraders.length > 0 ? (
            <div className="border rounded-lg divide-y">
              {topTraders.map((trader, index) => {
                const rank = index + 1;
                const reward = calculateReward(rank);
                const tier = DEFAULT_REWARD_TIERS[index];

                return (
                  <div key={trader.user_id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                          rank === 2 ? 'bg-gray-400/20 text-gray-400' :
                            rank === 3 ? 'bg-amber-600/20 text-amber-600' :
                              'bg-muted text-muted-foreground'
                        }`}>
                        {rank}
                      </div>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={trader.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {trader.display_name?.slice(0, 2).toUpperCase() || trader.user_id.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{getDisplayName(trader)}</p>
                        <p className="text-xs text-muted-foreground">
                          {trader.total_weighted_volume.toFixed(2)} weighted vol
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{reward.toFixed(2)} SOL</p>
                      <p className="text-xs text-muted-foreground">{tier?.percentage || 0}% of pool</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No trading activity found for this period</p>
            </div>
          )}
        </div>

        {/* Reward Tier Info */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <h5 className="text-sm font-medium">Reward Distribution</h5>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_REWARD_TIERS.slice(0, 5).map((tier) => (
              <Badge key={tier.rank} variant="outline" className="text-xs">
                #{tier.rank}: {tier.percentage}%
              </Badge>
            ))}
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +5 more tiers...
            </Badge>
          </div>
        </div>

        {/* Allocate Button */}
        <Button
          onClick={handleAllocate}
          disabled={isAllocating || !topTraders || topTraders.length === 0 || !totalRewardPool}
          className="w-full"
          size="lg"
        >
          {isAllocating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Allocating Rewards...
            </>
          ) : hasExistingAllocations ? (
            <>
              <Gift className="w-4 h-4 mr-2" />
              Update Reward Allocations
            </>
          ) : (
            <>
              <Gift className="w-4 h-4 mr-2" />
              Allocate Rewards to {topTraders?.length || 0} Traders
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

