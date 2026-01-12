import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Gift, Coins, Trophy, Sparkles, ChevronRight } from "lucide-react";
import { useBuybackProgram } from "@/hooks/useBuybackProgram";

interface BuybackProgramInfoProps {
  collectionId: string;
}

export function BuybackProgramInfo({ collectionId }: BuybackProgramInfoProps) {
  const { isInProgram, isLoading } = useBuybackProgram();
  
  const inProgram = isInProgram(collectionId);
  
  if (isLoading) {
    return null;
  }
  
  if (!inProgram) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-green-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Buyback Program Collection
          </CardTitle>
          <Badge className="bg-gradient-to-r from-primary to-green-500 text-primary-foreground">
            <Sparkles className="w-3 h-3 mr-1" />
            Enrolled
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This collection is part of <strong className="text-foreground">The Lily Pad Buyback Program</strong>. 
          When you trade NFTs from this collection, you contribute to the buyback pool and may earn rewards!
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Coins className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Volume Rewards</p>
              <p className="text-xs text-muted-foreground">
                Top volume movers receive SOL rewards
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="p-2 rounded-full bg-green-500/10">
              <Trophy className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Leaderboard</p>
              <p className="text-xs text-muted-foreground">
                Compete for top positions
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Gift className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Creator Benefits</p>
              <p className="text-xs text-muted-foreground">
                Featured collection status
              </p>
            </div>
          </div>
        </div>
        
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link to="/buyback-program">
            Learn More About the Program
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
