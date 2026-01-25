import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, TrendingUp, TrendingDown, Minus, Users, Coins, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PeriodStats {
  reward_period_start: string;
  reward_period_end: string;
  total_recipients: number;
  total_pool: number;
  claimed_amount: number;
  avg_reward: number;
  max_reward: number;
  min_reward: number;
}

export function RewardHistory() {
  const { data: periods, isLoading } = useQuery({
    queryKey: ['reward-history-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('volume_rewards')
        .select('reward_period_start, reward_period_end, reward_amount, is_claimed')
        .order('reward_period_start', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by period
      const periodMap = new Map<string, {
        reward_period_start: string;
        reward_period_end: string;
        rewards: { amount: number; claimed: boolean }[];
      }>();

      data.forEach(row => {
        const key = `${row.reward_period_start}_${row.reward_period_end}`;
        if (!periodMap.has(key)) {
          periodMap.set(key, {
            reward_period_start: row.reward_period_start,
            reward_period_end: row.reward_period_end,
            rewards: [],
          });
        }
        periodMap.get(key)!.rewards.push({
          amount: row.reward_amount,
          claimed: row.is_claimed,
        });
      });

      // Calculate stats for each period
      const stats: PeriodStats[] = [];
      periodMap.forEach(period => {
        const amounts = period.rewards.map(r => r.amount);
        const claimedAmounts = period.rewards.filter(r => r.claimed).map(r => r.amount);

        stats.push({
          reward_period_start: period.reward_period_start,
          reward_period_end: period.reward_period_end,
          total_recipients: period.rewards.length,
          total_pool: amounts.reduce((a, b) => a + b, 0),
          claimed_amount: claimedAmounts.reduce((a, b) => a + b, 0),
          avg_reward: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
          max_reward: Math.max(...amounts, 0),
          min_reward: Math.min(...amounts, 0),
        });
      });

      return stats.slice(0, 6); // Show last 6 periods
    },
  });

  const getTrend = (current: number, previous: number | undefined) => {
    if (!previous) return null;
    const diff = ((current - previous) / previous) * 100;
    if (Math.abs(diff) < 1) return { icon: Minus, color: "text-muted-foreground", value: "0%" };
    if (diff > 0) return { icon: TrendingUp, color: "text-green-500", value: `+${diff.toFixed(0)}%` };
    return { icon: TrendingDown, color: "text-red-500", value: `${diff.toFixed(0)}%` };
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
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
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
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
            <History className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Reward History</CardTitle>
            <CardDescription>Past distribution periods and pool sizes</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!periods || periods.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-4 rounded-full bg-muted w-fit mx-auto mb-3">
              <History className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No reward history yet</p>
            <p className="text-xs text-muted-foreground">
              Past reward distributions will appear here once allocated
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {periods.map((period, index) => {
              const previousPeriod = periods[index + 1];
              const poolTrend = getTrend(period.total_pool, previousPeriod?.total_pool);
              const claimRate = period.total_pool > 0
                ? (period.claimed_amount / period.total_pool) * 100
                : 0;

              return (
                <div
                  key={`${period.reward_period_start}_${period.reward_period_end}`}
                  className="rounded-lg border border-border/50 p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatPeriod(period.reward_period_start, period.reward_period_end)}
                      </span>
                    </div>
                    {poolTrend && (
                      <Badge variant="outline" className={`gap-1 ${poolTrend.color}`}>
                        <poolTrend.icon className="w-3 h-3" />
                        {poolTrend.value}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Coins className="w-3 h-3" />
                        Pool Size
                      </div>
                      <div className="font-semibold">
                        {period.total_pool.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Users className="w-3 h-3" />
                        Recipients
                      </div>
                      <div className="font-semibold">{period.total_recipients}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Avg Reward</div>
                      <div className="font-semibold">
                        {period.avg_reward.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Claim Progress</span>
                      <span className="font-medium">{claimRate.toFixed(0)}% claimed</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${claimRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Summary Stats */}
            {periods.length > 1 && (
              <div className="rounded-lg bg-muted/50 p-4 mt-4">
                <div className="text-xs font-medium mb-3">Historical Averages</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Avg Pool</div>
                    <div className="font-semibold">
                      {(periods.reduce((a, b) => a + b.total_pool, 0) / periods.length).toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Avg Recipients</div>
                    <div className="font-semibold">
                      {Math.round(periods.reduce((a, b) => a + b.total_recipients, 0) / periods.length)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Total Distributed</div>
                    <div className="font-semibold">
                      {periods.reduce((a, b) => a + b.total_pool, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
