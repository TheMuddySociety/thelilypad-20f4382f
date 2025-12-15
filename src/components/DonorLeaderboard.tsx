import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Coins } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TopDonor {
  from_username: string;
  from_user_id: string | null;
  total_amount: number;
  donation_count: number;
}

interface DonorLeaderboardProps {
  streamerId?: string;
  limit?: number;
  title?: string;
}

export const DonorLeaderboard = ({ 
  streamerId, 
  limit = 10,
  title = "Top Supporters"
}: DonorLeaderboardProps) => {
  const [donors, setDonors] = useState<TopDonor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopDonors = async () => {
      setLoading(true);
      
      let query = supabase
        .from('earnings')
        .select('from_username, from_user_id, amount')
        .eq('type', 'tip')
        .not('from_username', 'is', null);

      if (streamerId) {
        query = query.eq('user_id', streamerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching donors:', error);
        setLoading(false);
        return;
      }

      // Aggregate donations by donor
      const donorMap = new Map<string, TopDonor>();
      
      data?.forEach((earning) => {
        const username = earning.from_username || 'Anonymous';
        const existing = donorMap.get(username);
        
        if (existing) {
          existing.total_amount += Number(earning.amount);
          existing.donation_count += 1;
        } else {
          donorMap.set(username, {
            from_username: username,
            from_user_id: earning.from_user_id,
            total_amount: Number(earning.amount),
            donation_count: 1
          });
        }
      });

      // Sort by total amount and take top N
      const sorted = Array.from(donorMap.values())
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, limit);

      setDonors(sorted);
      setLoading(false);
    };

    fetchTopDonors();
  }, [streamerId, limit]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground font-medium">{index + 1}</span>;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/20";
      case 1:
        return "bg-gradient-to-r from-gray-400/10 to-gray-400/5 border-gray-400/20";
      case 2:
        return "bg-gradient-to-r from-amber-600/10 to-amber-600/5 border-amber-600/20";
      default:
        return "bg-card hover:bg-muted/50";
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (donors.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No donations yet</p>
            <p className="text-sm">Be the first to support!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {donors.map((donor, index) => (
          <div
            key={donor.from_username}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${getRankBg(index)}`}
          >
            <div className="flex-shrink-0">
              {getRankIcon(index)}
            </div>
            <Avatar className="h-10 w-10 border-2 border-border">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {donor.from_username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{donor.from_username}</p>
              <p className="text-xs text-muted-foreground">
                {donor.donation_count} {donor.donation_count === 1 ? 'tip' : 'tips'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary">
                {donor.total_amount.toFixed(4)} MON
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
