import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { TrendingUp, Coins, Activity, Zap, ArrowUpRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const LiveBuybackStats = () => {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);

  const { data: poolData } = useQuery({
    queryKey: ['buyback-pool-live'],
    queryFn: async () => {
      const { data } = await supabase
        .from('buyback_pool')
        .select('*')
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 30000, // Fallback polling every 30s
  });

  const { data: recentVolume } = useQuery({
    queryKey: ['volume-tracking-24h'],
    queryFn: async () => {
      const { data } = await supabase
        .from('volume_tracking')
        .select('volume_amount')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      const total = data?.reduce((sum, v) => sum + Number(v.volume_amount), 0) || 0;
      return total;
    },
    refetchInterval: 30000,
  });

  const { data: buybackCount } = useQuery({
    queryKey: ['buyback-events-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('buyback_events')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  // Real-time subscription for pool updates
  useEffect(() => {
    const channel = supabase
      .channel('buyback-pool-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyback_pool',
        },
        () => {
          setIsLive(true);
          queryClient.invalidateQueries({ queryKey: ['buyback-pool-live'] });
          setTimeout(() => setIsLive(false), 2000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'volume_tracking',
        },
        () => {
          setIsLive(true);
          queryClient.invalidateQueries({ queryKey: ['volume-tracking-24h'] });
          setTimeout(() => setIsLive(false), 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const poolBalance = poolData?.pool_balance || 0;
  const accumulatedVolume = poolData?.accumulated_volume || 0;
  const threshold = poolData?.buyback_threshold || 100;
  const progress = threshold > 0 ? Math.min((accumulatedVolume / threshold) * 100, 100) : 0;
  const totalBuybacks = poolData?.total_buybacks_executed || buybackCount || 0;

  const stats = [
    {
      icon: Coins,
      label: "Pool Balance",
      value: Number(poolBalance),
      suffix: " MON",
      decimals: 4,
      color: "text-primary",
      bgColor: "from-primary/20 to-primary/5",
      iconBg: "bg-primary/20",
    },
    {
      icon: Activity,
      label: "24h Volume",
      value: recentVolume || 0,
      suffix: " MON",
      decimals: 2,
      color: "text-green-500",
      bgColor: "from-green-500/20 to-green-500/5",
      iconBg: "bg-green-500/20",
    },
    {
      icon: TrendingUp,
      label: "Accumulated",
      value: Number(accumulatedVolume),
      suffix: " MON",
      decimals: 2,
      color: "text-amber-500",
      bgColor: "from-amber-500/20 to-amber-500/5",
      iconBg: "bg-amber-500/20",
    },
    {
      icon: Zap,
      label: "Total Buybacks",
      value: totalBuybacks,
      suffix: "",
      decimals: 0,
      color: "text-blue-500",
      bgColor: "from-blue-500/20 to-blue-500/5",
      iconBg: "bg-blue-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Live indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
        <span className="text-sm text-muted-foreground">
          {isLive ? 'Live update' : 'Real-time stats'}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={stat.label}
            className={`overflow-hidden border-border/50 transition-all duration-300 ${isLive ? 'ring-2 ring-primary/30' : ''}`}
          >
            <CardContent className={`p-6 bg-gradient-to-br ${stat.bgColor}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                {index === 0 && isLive && (
                  <ArrowUpRight className="w-4 h-4 text-green-500 animate-bounce" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  <AnimatedCounter
                    value={stat.value}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                  />
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress to Next Buyback */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold">Next Buyback Progress</span>
            </div>
            <span className="text-sm text-muted-foreground">
              <AnimatedCounter value={accumulatedVolume} decimals={2} /> / {threshold} MON
            </span>
          </div>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            {progress >= 100 ? (
              <span className="text-green-500 font-medium flex items-center justify-center gap-1">
                <Zap className="w-4 h-4" />
                Buyback threshold reached!
              </span>
            ) : (
              <>
                <AnimatedCounter value={100 - progress} decimals={1} suffix="%" /> more volume needed to trigger buyback
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveBuybackStats;
