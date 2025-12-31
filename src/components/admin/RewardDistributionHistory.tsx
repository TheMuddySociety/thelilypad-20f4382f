import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  Calendar, 
  Users, 
  Coins, 
  CheckCircle2,
  Clock,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface RewardPeriodSummary {
  period_start: string;
  period_end: string;
  total_distributed: number;
  total_claimed: number;
  recipient_count: number;
  claimed_count: number;
  top_reward: number;
  total_weighted_volume: number;
}

export function RewardDistributionHistory() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['reward-distribution-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('volume_rewards')
        .select('*')
        .order('reward_period_end', { ascending: false });

      if (error) throw error;

      // Group by period
      const periodMap = new Map<string, RewardPeriodSummary>();
      
      data?.forEach(reward => {
        const key = `${reward.reward_period_start}-${reward.reward_period_end}`;
        const existing = periodMap.get(key);
        
        if (existing) {
          existing.total_distributed += Number(reward.reward_amount);
          existing.total_claimed += reward.is_claimed ? Number(reward.reward_amount) : 0;
          existing.recipient_count += 1;
          existing.claimed_count += reward.is_claimed ? 1 : 0;
          existing.top_reward = Math.max(existing.top_reward, Number(reward.reward_amount));
          existing.total_weighted_volume += Number(reward.weighted_volume);
        } else {
          periodMap.set(key, {
            period_start: reward.reward_period_start,
            period_end: reward.reward_period_end,
            total_distributed: Number(reward.reward_amount),
            total_claimed: reward.is_claimed ? Number(reward.reward_amount) : 0,
            recipient_count: 1,
            claimed_count: reward.is_claimed ? 1 : 0,
            top_reward: Number(reward.reward_amount),
            total_weighted_volume: Number(reward.weighted_volume),
          });
        }
      });

      return Array.from(periodMap.values()).sort(
        (a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime()
      );
    },
  });

  const formatPeriod = (start: string, end: string) => {
    return `${format(new Date(start), 'MMM d')} - ${format(new Date(end), 'MMM d, yyyy')}`;
  };

  const getClaimProgress = (claimed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((claimed / total) * 100);
  };

  // Calculate totals
  const totals = history?.reduce(
    (acc, period) => ({
      totalDistributed: acc.totalDistributed + period.total_distributed,
      totalClaimed: acc.totalClaimed + period.total_claimed,
      totalRecipients: acc.totalRecipients + period.recipient_count,
    }),
    { totalDistributed: 0, totalClaimed: 0, totalRecipients: 0 }
  ) || { totalDistributed: 0, totalClaimed: 0, totalRecipients: 0 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Reward Distribution History
        </CardTitle>
        <CardDescription>
          View all past reward allocations and claim status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Coins className="w-4 h-4" />
              Total Distributed
            </div>
            <p className="text-2xl font-bold text-primary">
              {totals.totalDistributed.toFixed(2)} MON
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Total Claimed
            </div>
            <p className="text-2xl font-bold text-green-500">
              {totals.totalClaimed.toFixed(2)} MON
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              Total Recipients
            </div>
            <p className="text-2xl font-bold">
              {totals.totalRecipients}
            </p>
          </div>
        </div>

        {/* History Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : history && history.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Total Pool</TableHead>
                  <TableHead>Top Reward</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Claim Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((period, index) => {
                  const claimProgress = getClaimProgress(period.claimed_count, period.recipient_count);
                  const isFullyClaimed = period.claimed_count === period.recipient_count;
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatPeriod(period.period_start, period.period_end)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {period.recipient_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-primary">
                          {period.total_distributed.toFixed(2)} MON
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {period.top_reward.toFixed(2)} MON
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {period.total_weighted_volume.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isFullyClaimed ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            All Claimed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" />
                            {period.claimed_count}/{period.recipient_count} ({claimProgress}%)
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No reward distributions yet</p>
            <p className="text-sm">
              Allocate rewards to top traders to see the history here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
