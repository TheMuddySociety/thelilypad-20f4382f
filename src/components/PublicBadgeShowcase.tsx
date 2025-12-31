import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown, 
  Flame, 
  Swords,
  Sparkles
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";

interface ChallengeBadge {
  id: string;
  user_id: string;
  badge_type: string;
  badge_name: string;
  badge_icon: string;
  description: string | null;
  earned_at: string;
  metadata: {
    streak?: number;
    duration_days?: number;
    total_wins?: number;
    opponent_streak?: number;
  } | null;
}

interface PublicBadgeShowcaseProps {
  userId: string;
  displayName?: string;
  compact?: boolean;
}

const BADGE_CONFIGS: Record<string, { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
  borderColor: string;
  tier: number;
}> = {
  challenge_victory: { 
    icon: Trophy, 
    color: "text-amber-500", 
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    tier: 1
  },
  challenge_champion: { 
    icon: Award, 
    color: "text-blue-500", 
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    tier: 2
  },
  challenge_master: { 
    icon: Medal, 
    color: "text-purple-500", 
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    tier: 3
  },
  challenge_legend: { 
    icon: Crown, 
    color: "text-yellow-400", 
    bgColor: "bg-yellow-400/10",
    borderColor: "border-yellow-400/30",
    tier: 4
  },
  streak_warrior: { 
    icon: Swords, 
    color: "text-red-500", 
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    tier: 2
  },
  streak_dominator: { 
    icon: Flame, 
    color: "text-orange-500", 
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    tier: 3
  },
};

export const PublicBadgeShowcase = ({ userId, displayName, compact = false }: PublicBadgeShowcaseProps) => {
  const { data: badges, isLoading } = useQuery({
    queryKey: ["public-badges", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_badges")
        .select("*")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data as ChallengeBadge[];
    },
    enabled: !!userId,
  });

  // Get unique badge types with counts, prioritizing higher tiers
  const uniqueBadges = badges?.reduce((acc, badge) => {
    const existing = acc.find(b => b.badge_type === badge.badge_type);
    if (!existing) {
      acc.push({ ...badge, count: 1 });
    } else {
      existing.count = (existing.count || 1) + 1;
    }
    return acc;
  }, [] as (ChallengeBadge & { count: number })[]);

  // Sort by tier (highest first)
  const sortedBadges = uniqueBadges?.sort((a, b) => {
    const tierA = BADGE_CONFIGS[a.badge_type]?.tier || 0;
    const tierB = BADGE_CONFIGS[b.badge_type]?.tier || 0;
    return tierB - tierA;
  });

  const totalWins = badges?.length || 0;

  if (isLoading) {
    return compact ? (
      <div className="flex gap-1">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>
    ) : (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!badges || badges.length === 0) {
    if (compact) return null;
    
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            Challenge Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-2">
            No badges earned yet
          </p>
        </CardContent>
      </Card>
    );
  }

  // Compact mode - just show badge icons inline
  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1 flex-wrap">
          {sortedBadges?.slice(0, 5).map((badge) => {
            const config = BADGE_CONFIGS[badge.badge_type] || BADGE_CONFIGS.challenge_victory;
            const IconComponent = config.icon;
            
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <div className={`w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center cursor-help`}>
                    <IconComponent className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{badge.badge_name}</p>
                  {badge.count > 1 && <p className="text-xs">×{badge.count}</p>}
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {sortedBadges && sortedBadges.length > 5 && (
            <Badge variant="outline" className="text-xs h-6">
              +{sortedBadges.length - 5}
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Full card display
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Challenge Badges
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {totalWins} earned
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {sortedBadges?.map((badge) => {
              const config = BADGE_CONFIGS[badge.badge_type] || BADGE_CONFIGS.challenge_victory;
              const IconComponent = config.icon;
              
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <div 
                      className={`aspect-square rounded-xl ${config.bgColor} border ${config.borderColor} flex flex-col items-center justify-center p-2 cursor-help hover:scale-105 transition-transform`}
                    >
                      <IconComponent className={`w-6 h-6 ${config.color}`} />
                      {badge.count > 1 && (
                        <span className="text-xs font-medium mt-1">×{badge.count}</span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="font-medium">{badge.badge_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Earned {format(new Date(badge.earned_at), "MMM d, yyyy")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Featured badge */}
        {sortedBadges && sortedBadges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Featured Achievement</p>
            {(() => {
              const featured = sortedBadges[0];
              const config = BADGE_CONFIGS[featured.badge_type] || BADGE_CONFIGS.challenge_victory;
              const IconComponent = config.icon;
              
              return (
                <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                  <div className={`w-12 h-12 rounded-full bg-background/50 flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className={`w-6 h-6 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{featured.badge_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {featured.description}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
