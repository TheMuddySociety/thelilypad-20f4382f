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

const BADGE_CONFIGS: Record<string, { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
  borderColor: string;
}> = {
  challenge_victory: { 
    icon: Trophy, 
    color: "text-amber-500", 
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30"
  },
  challenge_champion: { 
    icon: Award, 
    color: "text-blue-500", 
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30"
  },
  challenge_master: { 
    icon: Medal, 
    color: "text-purple-500", 
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30"
  },
  challenge_legend: { 
    icon: Crown, 
    color: "text-yellow-400", 
    bgColor: "bg-yellow-400/10",
    borderColor: "border-yellow-400/30"
  },
  streak_warrior: { 
    icon: Swords, 
    color: "text-red-500", 
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30"
  },
  streak_dominator: { 
    icon: Flame, 
    color: "text-orange-500", 
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30"
  },
};

export const ChallengeBadges = () => {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: badges, isLoading } = useQuery({
    queryKey: ["challenge-badges", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from("challenge_badges")
        .select("*")
        .eq("user_id", session.user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return data as ChallengeBadge[];
    },
    enabled: !!session?.user?.id,
  });

  // Group badges by type and count
  const badgeStats = badges?.reduce((acc, badge) => {
    if (!acc[badge.badge_type]) {
      acc[badge.badge_type] = { count: 0, latest: badge };
    }
    acc[badge.badge_type].count++;
    return acc;
  }, {} as Record<string, { count: number; latest: ChallengeBadge }>);

  const totalWins = badges?.filter(b => 
    b.badge_type === "challenge_victory" || 
    b.badge_type === "challenge_champion" ||
    b.badge_type === "challenge_master" ||
    b.badge_type === "challenge_legend"
  ).length || 0;

  if (!session) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Challenge Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Sign in to view your challenge badges
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Challenge Badges
          </CardTitle>
          {totalWins > 0 && (
            <Badge className="bg-primary/20 text-primary">
              {totalWins} Win{totalWins !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : badges && badges.length > 0 ? (
          <div className="space-y-4">
            {/* Badge Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(badgeStats || {}).map(([type, stats]) => {
                const config = BADGE_CONFIGS[type] || BADGE_CONFIGS.challenge_victory;
                const IconComponent = config.icon;
                
                return (
                  <div
                    key={type}
                    className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor} text-center`}
                  >
                    <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center mx-auto mb-2`}>
                      <IconComponent className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <p className="text-sm font-medium truncate">{stats.latest.badge_name}</p>
                    {stats.count > 1 && (
                      <p className="text-xs text-muted-foreground">×{stats.count}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recent Badges */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Recent Achievements</h4>
              {badges.slice(0, 3).map((badge) => {
                const config = BADGE_CONFIGS[badge.badge_type] || BADGE_CONFIGS.challenge_victory;
                const IconComponent = config.icon;
                
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}
                  >
                    <div className={`w-10 h-10 rounded-full bg-background/50 flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{badge.badge_name}</p>
                        {badge.metadata?.streak && (
                          <Badge variant="outline" className="text-xs">
                            <Flame className="w-3 h-3 mr-1 text-orange-500" />
                            {badge.metadata.streak}d
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {badge.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(badge.earned_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No badges yet</p>
            <p className="text-xs text-muted-foreground">Win streak challenges to earn badges!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
