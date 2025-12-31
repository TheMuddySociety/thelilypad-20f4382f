import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWallet } from "@/providers/WalletProvider";
import { useVotingPower, useGovernanceStats } from "@/hooks/useGovernance";
import { GOVERNANCE_PARAMS } from "@/config/governance";
import { Coins, TrendingUp, Users, Wallet, ExternalLink } from "lucide-react";

export const TokenStats: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { data: votingPower } = useVotingPower(address);
  const { data: stats } = useGovernanceStats();

  const maxSupply = GOVERNANCE_PARAMS.maxSupply;
  const circulatingPercent = stats?.totalVotingPower 
    ? (stats.totalVotingPower / maxSupply) * 100 
    : 0;

  const tokenDistribution = [
    { label: "Treasury", percent: 35, color: "bg-primary" },
    { label: "Community", percent: 25, color: "bg-blue-500" },
    { label: "Liquidity", percent: 25, color: "bg-purple-500" },
    { label: "Team", percent: 15, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Your Token Stats */}
      {isConnected && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Your LILY Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold">{votingPower?.balance.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">LILY tokens</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Voting Power</p>
                <p className="text-2xl font-bold">{votingPower?.votingPower.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {votingPower?.delegatedTo ? "Delegated" : "Self-delegated"}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">% of Total Supply</p>
                <p className="text-2xl font-bold">
                  {votingPower?.balance 
                    ? ((votingPower.balance / maxSupply) * 100).toFixed(4)
                    : "0"
                  }%
                </p>
                <p className="text-xs text-muted-foreground">of 100M max</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Token Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Token Name</span>
              <span className="font-medium">LilyPad Governance</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Symbol</span>
              <Badge variant="secondary">LILY</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Max Supply</span>
              <span className="font-medium">100,000,000</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Decimals</span>
              <span className="font-medium">18</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium">Monad</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Token Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokenDistribution.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.percent}%</span>
                </div>
                <Progress value={item.percent} className="h-2" />
              </div>
            ))}

            <div className="pt-4 border-t border-border/50">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Active Voting Power</span>
                <span className="font-medium">{circulatingPercent.toFixed(2)}%</span>
              </div>
              <Progress value={circulatingPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Holders Stats */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Holder Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{stats?.totalHolders.toLocaleString() || 0}</p>
              <p className="text-sm text-muted-foreground">Total Holders</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">
                {stats?.totalVotingPower 
                  ? `${(stats.totalVotingPower / 1_000_000).toFixed(1)}M`
                  : "0"
                }
              </p>
              <p className="text-sm text-muted-foreground">Total Voting Power</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{GOVERNANCE_PARAMS.proposalThreshold.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Proposal Threshold</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{GOVERNANCE_PARAMS.quorumPercentage}%</p>
              <p className="text-sm text-muted-foreground">Quorum Required</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Links */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Contract Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">LILY Token</p>
                <p className="text-sm text-muted-foreground font-mono">Deploy and update in config</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Governor</p>
                <p className="text-sm text-muted-foreground font-mono">Deploy and update in config</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Timelock</p>
                <p className="text-sm text-muted-foreground font-mono">Deploy and update in config</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
