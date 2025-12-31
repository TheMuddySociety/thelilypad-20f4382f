import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Trophy, CheckCircle2, Clock, Coins, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface VolumeReward {
  id: string;
  user_id: string;
  reward_period_start: string;
  reward_period_end: string;
  rank: number;
  weighted_volume: number;
  reward_amount: number;
  is_claimed: boolean;
  claimed_at: string | null;
  claim_tx_hash: string | null;
  created_at: string;
}

export function RewardsClaimCard() {
  const queryClient = useQueryClient();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: rewards, isLoading } = useQuery({
    queryKey: ['volume-rewards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('volume_rewards')
        .select('*')
        .eq('user_id', user.id)
        .order('reward_period_end', { ascending: false });
      
      if (error) throw error;
      return data as VolumeReward[];
    },
    enabled: !!user?.id,
  });

  const claimMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      // Simulate blockchain transaction
      const mockTxHash = `0x${Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;
      
      const { error } = await supabase
        .from('volume_rewards')
        .update({
          is_claimed: true,
          claimed_at: new Date().toISOString(),
          claim_tx_hash: mockTxHash,
        })
        .eq('id', rewardId);
      
      if (error) throw error;
      return mockTxHash;
    },
    onSuccess: (txHash) => {
      queryClient.invalidateQueries({ queryKey: ['volume-rewards'] });
      toast({
        title: "Rewards Claimed!",
        description: `Your MON rewards have been sent to your wallet. TX: ${txHash.slice(0, 10)}...`,
      });
    },
    onError: () => {
      toast({
        title: "Claim Failed",
        description: "Unable to claim rewards. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setClaimingId(null);
    },
  });

  const handleClaim = (rewardId: string) => {
    setClaimingId(rewardId);
    claimMutation.mutate(rewardId);
  };

  const unclaimedRewards = rewards?.filter(r => !r.is_claimed) || [];
  const claimedRewards = rewards?.filter(r => r.is_claimed) || [];
  const totalUnclaimed = unclaimedRewards.reduce((sum, r) => sum + Number(r.reward_amount), 0);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">🥇 1st</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400/20 text-gray-300 border-gray-400/30">🥈 2nd</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600/20 text-amber-500 border-amber-600/30">🥉 3rd</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  const formatPeriod = (start: string, end: string) => {
    return `${format(new Date(start), 'MMM d')} - ${format(new Date(end), 'MMM d, yyyy')}`;
  };

  if (!user) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Volume Rewards
          </CardTitle>
          <CardDescription>
            Sign in to view and claim your trading rewards
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Volume Rewards
            </CardTitle>
            <CardDescription>
              Claim your MON rewards for being a top trader
            </CardDescription>
          </div>
          {totalUnclaimed > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Available to Claim</p>
              <p className="text-lg font-bold text-primary flex items-center gap-1">
                <Coins className="w-4 h-4" />
                {totalUnclaimed.toFixed(2)} MON
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unclaimed Rewards */}
        {unclaimedRewards.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Pending Rewards
            </h4>
            {unclaimedRewards.map((reward) => (
              <div
                key={reward.id}
                className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRankBadge(reward.rank)}
                    <div>
                      <p className="font-medium">{reward.reward_amount.toFixed(2)} MON</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPeriod(reward.reward_period_start, reward.reward_period_end)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleClaim(reward.id)}
                    disabled={claimingId === reward.id}
                    className="gap-2"
                  >
                    {claimingId === reward.id ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Trophy className="w-4 h-4" />
                        Claim
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Weighted Volume: {Number(reward.weighted_volume).toFixed(2)} MON
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Claimed Rewards */}
        {claimedRewards.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Claimed Rewards
            </h4>
            {claimedRewards.slice(0, 3).map((reward) => (
              <div
                key={reward.id}
                className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRankBadge(reward.rank)}
                    <div>
                      <p className="font-medium text-muted-foreground">
                        {reward.reward_amount.toFixed(2)} MON
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPeriod(reward.reward_period_start, reward.reward_period_end)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Claimed
                  </Badge>
                </div>
                {reward.claimed_at && (
                  <p className="text-xs text-muted-foreground">
                    Claimed on {format(new Date(reward.claimed_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {rewards?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No rewards yet</p>
            <p className="text-sm">
              Trade more to earn a spot on the leaderboard and receive MON rewards!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
