import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Award, 
  Trophy, 
  Star, 
  Zap, 
  Flame, 
  Crown, 
  Rocket, 
  Target,
  TrendingUp,
  Coins,
  Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  requirement: number;
  type: 'volume' | 'trades' | 'streak' | 'rank';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  color: string;
  bgColor: string;
}

const ACHIEVEMENTS: Achievement[] = [
  // Volume Milestones
  { id: 'vol_1', name: 'First Steps', description: 'Trade 10 MON in volume', icon: Star, requirement: 10, type: 'volume', tier: 'bronze', color: 'text-amber-600', bgColor: 'bg-amber-600/10' },
  { id: 'vol_2', name: 'Getting Started', description: 'Trade 100 MON in volume', icon: Coins, requirement: 100, type: 'volume', tier: 'bronze', color: 'text-amber-600', bgColor: 'bg-amber-600/10' },
  { id: 'vol_3', name: 'Active Trader', description: 'Trade 500 MON in volume', icon: TrendingUp, requirement: 500, type: 'volume', tier: 'silver', color: 'text-slate-400', bgColor: 'bg-slate-400/10' },
  { id: 'vol_4', name: 'Volume Mover', description: 'Trade 1,000 MON in volume', icon: Zap, requirement: 1000, type: 'volume', tier: 'silver', color: 'text-slate-400', bgColor: 'bg-slate-400/10' },
  { id: 'vol_5', name: 'Market Maker', description: 'Trade 5,000 MON in volume', icon: Flame, requirement: 5000, type: 'volume', tier: 'gold', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  { id: 'vol_6', name: 'Whale Watcher', description: 'Trade 10,000 MON in volume', icon: Trophy, requirement: 10000, type: 'volume', tier: 'gold', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  { id: 'vol_7', name: 'Trading Legend', description: 'Trade 50,000 MON in volume', icon: Crown, requirement: 50000, type: 'volume', tier: 'platinum', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
  { id: 'vol_8', name: 'Volume King', description: 'Trade 100,000 MON in volume', icon: Rocket, requirement: 100000, type: 'volume', tier: 'diamond', color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
  
  // Trade Count Milestones
  { id: 'trade_1', name: 'First Trade', description: 'Complete 1 trade', icon: Target, requirement: 1, type: 'trades', tier: 'bronze', color: 'text-amber-600', bgColor: 'bg-amber-600/10' },
  { id: 'trade_2', name: 'Regular Trader', description: 'Complete 10 trades', icon: Award, requirement: 10, type: 'trades', tier: 'silver', color: 'text-slate-400', bgColor: 'bg-slate-400/10' },
  { id: 'trade_3', name: 'Dedicated Trader', description: 'Complete 50 trades', icon: Star, requirement: 50, type: 'trades', tier: 'gold', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  { id: 'trade_4', name: 'Trading Machine', description: 'Complete 100 trades', icon: Zap, requirement: 100, type: 'trades', tier: 'platinum', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
];

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export function VolumeAchievements() {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;

  const { data: userStats, isLoading } = useQuery({
    queryKey: ['user-achievement-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from('volume_tracking')
        .select('weighted_volume')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo);

      if (error) throw error;

      const totalVolume = data?.reduce((a, b) => a + Number(b.weighted_volume), 0) || 0;
      const tradeCount = data?.length || 0;

      return { totalVolume, tradeCount };
    },
    enabled: !!userId,
  });

  const achievementStatus = useMemo(() => {
    if (!userStats) {
      return ACHIEVEMENTS.map(a => ({ ...a, progress: 0, unlocked: false, current: 0 }));
    }

    return ACHIEVEMENTS.map(achievement => {
      let current = 0;
      if (achievement.type === 'volume') {
        current = userStats.totalVolume;
      } else if (achievement.type === 'trades') {
        current = userStats.tradeCount;
      }

      const progress = Math.min((current / achievement.requirement) * 100, 100);
      const unlocked = current >= achievement.requirement;

      return { ...achievement, progress, unlocked, current };
    });
  }, [userStats]);

  const unlockedCount = achievementStatus.filter(a => a.unlocked).length;
  const totalCount = achievementStatus.length;

  const nextAchievement = achievementStatus.find(a => !a.unlocked);

  if (!session) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Achievements</CardTitle>
              <CardDescription>Sign in to track your milestones</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {ACHIEVEMENTS.slice(0, 6).map((achievement) => (
              <div
                key={achievement.id}
                className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center"
              >
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
            ))}
          </div>
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
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Achievements</CardTitle>
              <CardDescription>Unlock milestones as you trade</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Award className="w-3 h-3" />
            {unlockedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Achievement Progress */}
        {nextAchievement && (
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${nextAchievement.bgColor}`}>
                <nextAchievement.icon className={`w-5 h-5 ${nextAchievement.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{nextAchievement.name}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {nextAchievement.tier}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{nextAchievement.description}</p>
              </div>
            </div>
            <Progress value={nextAchievement.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>
                {nextAchievement.type === 'volume' 
                  ? `${nextAchievement.current.toFixed(0)} MON`
                  : `${nextAchievement.current} trades`
                }
              </span>
              <span>
                {nextAchievement.type === 'volume'
                  ? `${nextAchievement.requirement.toLocaleString()} MON`
                  : `${nextAchievement.requirement} trades`
                }
              </span>
            </div>
          </div>
        )}

        {/* Achievement Grid */}
        <div className="space-y-3">
          {TIER_ORDER.map(tier => {
            const tierAchievements = achievementStatus.filter(a => a.tier === tier);
            if (tierAchievements.length === 0) return null;

            return (
              <div key={tier}>
                <div className="text-xs font-medium text-muted-foreground mb-2 capitalize">
                  {tier} Tier
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {tierAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all ${
                        achievement.unlocked
                          ? `${achievement.bgColor} border-2 border-current ${achievement.color}`
                          : 'bg-muted/30 border border-border/50 opacity-50'
                      }`}
                      title={`${achievement.name}: ${achievement.description}`}
                    >
                      {achievement.unlocked ? (
                        <achievement.icon className={`w-6 h-6 ${achievement.color}`} />
                      ) : (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="text-[10px] mt-1 text-center leading-tight truncate w-full">
                        {achievement.unlocked ? achievement.name.split(' ')[0] : '???'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Summary */}
        {userStats && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {userStats.totalVolume.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Volume (MON)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{userStats.tradeCount}</div>
              <div className="text-xs text-muted-foreground">Total Trades</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
