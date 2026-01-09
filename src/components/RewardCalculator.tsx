import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, Trophy, Info, Coins, BarChart3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const REWARD_TIERS = [
  { rank: 1, percentage: 25, label: "1st Place" },
  { rank: 2, percentage: 15, label: "2nd Place" },
  { rank: 3, percentage: 10, label: "3rd Place" },
  { rank: 4, percentage: 8, label: "4th Place" },
  { rank: 5, percentage: 7, label: "5th Place" },
  { rank: 6, percentage: 6, label: "6th Place" },
  { rank: 7, percentage: 5, label: "7th Place" },
  { rank: 8, percentage: 4, label: "8th Place" },
  { rank: 9, percentage: 3, label: "9th Place" },
  { rank: 10, percentage: 2, label: "10th Place" },
];

// Volume weights for different transaction types
const VOLUME_WEIGHTS = {
  nft_sell: 1.0,
  nft_buy: 1.0,
  offer: 0.5,
  listing: 0.25,
  sticker_purchase: 0.75,
  emote_purchase: 0.75,
  emoji_purchase: 0.5,
};

export function RewardCalculator() {
  const [volume, setVolume] = useState<number>(100);
  const [expectedRank, setExpectedRank] = useState<number>(5);
  const [rewardPool, setRewardPool] = useState<number>(1000);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  const calculations = useMemo(() => {
    const tier = REWARD_TIERS.find(t => t.rank === expectedRank) || REWARD_TIERS[4];
    const estimatedReward = (rewardPool * tier.percentage) / 100;
    const rewardPerVolume = volume > 0 ? estimatedReward / volume : 0;
    
    return {
      tier,
      estimatedReward,
      rewardPerVolume,
      weightedVolume: volume * VOLUME_WEIGHTS.nft_sell,
    };
  }, [volume, expectedRank, rewardPool]);

  const allRankRewards = useMemo(() => {
    return REWARD_TIERS.map(tier => ({
      ...tier,
      reward: (rewardPool * tier.percentage) / 100,
      rewardPerVolume: volume > 0 ? ((rewardPool * tier.percentage) / 100) / volume : 0,
    }));
  }, [rewardPool, volume]);

  const maxReward = useMemo(() => Math.max(...allRankRewards.map(r => r.reward)), [allRankRewards]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setVolume(Math.max(0, value));
  };

  const handlePoolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setRewardPool(Math.max(0, value));
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Reward Calculator</CardTitle>
              <CardDescription>Estimate your potential earnings</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showComparison ? "default" : "outline"}
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="gap-1"
            >
              <BarChart3 className="w-4 h-4" />
              Compare
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>This calculator provides estimates based on the current reward structure. Actual rewards depend on competition and pool size.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="volume" className="flex items-center gap-1">
              Your Trading Volume
              <span className="text-muted-foreground text-xs">(SOL)</span>
            </Label>
            <Input
              id="volume"
              type="number"
              value={volume}
              onChange={handleVolumeChange}
              placeholder="Enter volume"
              min={0}
              step={10}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pool" className="flex items-center gap-1">
              Reward Pool Size
              <span className="text-muted-foreground text-xs">(SOL)</span>
            </Label>
            <Input
              id="pool"
              type="number"
              value={rewardPool}
              onChange={handlePoolChange}
              placeholder="Enter pool size"
              min={0}
              step={100}
            />
          </div>
        </div>

        {/* Comparison View */}
        {showComparison ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="w-4 h-4 text-primary" />
              Earnings by Rank
            </div>
            <div className="space-y-2">
              {allRankRewards.map((tier) => (
                <div
                  key={tier.rank}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    tier.rank === expectedRank ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'
                  }`}
                  onClick={() => setExpectedRank(tier.rank)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="w-8 flex-shrink-0">
                    <Badge 
                      variant={tier.rank <= 3 ? "default" : "secondary"}
                      className={`w-full justify-center ${
                        tier.rank === 1 ? 'bg-amber-500 hover:bg-amber-500' :
                        tier.rank === 2 ? 'bg-slate-400 hover:bg-slate-400' :
                        tier.rank === 3 ? 'bg-amber-700 hover:bg-amber-700' : ''
                      }`}
                    >
                      #{tier.rank}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300"
                        style={{ width: `${(tier.reward / maxReward) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right flex-shrink-0">
                    <div className="font-semibold text-sm">
                      {tier.reward.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tier.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
              Click any rank to select it for detailed view
            </div>
          </div>
        ) : (
          <>
            {/* Expected Rank Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Expected Rank
                </Label>
                <Badge variant="secondary" className="font-mono">
                  #{expectedRank}
                </Badge>
              </div>
              <Slider
                value={[expectedRank]}
                onValueChange={(v) => setExpectedRank(v[0])}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1st (25%)</span>
                <span>10th (2%)</span>
              </div>
            </div>

            {/* Results */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4 text-primary" />
                Estimated Earnings
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-lg p-3 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Reward Amount</div>
                  <div className="text-2xl font-bold text-primary">
                    {calculations.estimatedReward.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground">SOL</div>
                </div>
                <div className="bg-background rounded-lg p-3 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Pool Share</div>
                  <div className="text-2xl font-bold">
                    {calculations.tier.percentage}%
                  </div>
                  <div className="text-xs text-muted-foreground">{calculations.tier.label}</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground border-t border-border/50 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span>Return per SOL traded:</span>
                  <span className="font-medium text-foreground">
                    {calculations.rewardPerVolume.toFixed(4)} SOL
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Weighted volume:</span>
                  <span className="font-medium text-foreground">
                    {calculations.weightedVolume.toLocaleString()} SOL
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Volume Weight Info */}
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1 mb-2 font-medium">
            <Coins className="w-3 h-3" />
            Volume Weights
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1">
              <span>Sales/Buys</span>
              <Badge variant="outline" className="text-xs h-5">1.0x</Badge>
            </div>
            <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1">
              <span>Stickers</span>
              <Badge variant="outline" className="text-xs h-5">0.75x</Badge>
            </div>
            <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1">
              <span>Offers</span>
              <Badge variant="outline" className="text-xs h-5">0.5x</Badge>
            </div>
            <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1">
              <span>Listings</span>
              <Badge variant="outline" className="text-xs h-5">0.25x</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
