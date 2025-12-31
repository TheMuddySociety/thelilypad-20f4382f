import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWallet } from "@/providers/WalletProvider";
import { useVotingPower, useGovernanceStats, useGovernanceConfig } from "@/hooks/useGovernance";
import { GOVERNANCE_PARAMS, NFT_VOTING_TIERS } from "@/config/governance";
import { Image, TrendingUp, Users, Wallet, Lock } from "lucide-react";

export const TokenStats: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { data: votingPower } = useVotingPower(address);
  const { data: stats } = useGovernanceStats();
  const { data: config } = useGovernanceConfig();

  return (
    <div className="space-y-6">
      {/* Your NFT Stats */}
      {isConnected && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Your Governance NFTs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Total NFTs</p>
                <p className="text-2xl font-bold">{votingPower?.nftCount || 0}</p>
                <p className="text-xs text-muted-foreground">governance NFTs</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Voting Power</p>
                <p className="text-2xl font-bold">{votingPower?.votingPower || 0}</p>
                <p className="text-xs text-muted-foreground">total votes</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Rarity Breakdown</p>
                <div className="text-xs space-y-1 mt-1">
                  <div className="flex justify-between">
                    <span>Common:</span>
                    <span className="font-medium">{votingPower?.rarityBreakdown?.common || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rare:</span>
                    <span className="font-medium">{votingPower?.rarityBreakdown?.rare || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Legendary:</span>
                    <span className="font-medium">{votingPower?.rarityBreakdown?.legendary || 0}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Can Create Proposals</p>
                <p className="text-2xl font-bold">
                  {(votingPower?.nftCount || 0) >= GOVERNANCE_PARAMS.proposalThresholdNFTs ? "Yes" : "No"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Need {GOVERNANCE_PARAMS.proposalThresholdNFTs}+ NFTs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voting Power Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Image className="w-5 h-5" />
              NFT Voting Power Tiers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span>Common</span>
              </div>
              <Badge variant="secondary">{NFT_VOTING_TIERS.common} vote</Badge>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Rare</span>
              </div>
              <Badge variant="secondary">{NFT_VOTING_TIERS.rare} votes</Badge>
            </div>
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Legendary</span>
              </div>
              <Badge variant="secondary">{NFT_VOTING_TIERS.legendary} votes</Badge>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>Voting power is calculated based on NFT rarity. Higher rarity NFTs grant more voting power.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Governance Collection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {config?.governance_collection_id ? (
              <>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Collection</span>
                  <span className="font-medium">Lily Pad Genesis</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium">Monad</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No governance collection configured yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  The official governance NFT collection will be set by admins when ready.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holder Statistics */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Governance Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{stats?.totalHolders || 0}</p>
              <p className="text-sm text-muted-foreground">NFT Holders</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{stats?.totalVotingPower || 0}</p>
              <p className="text-sm text-muted-foreground">Total Voting Power</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{GOVERNANCE_PARAMS.proposalThresholdNFTs}</p>
              <p className="text-sm text-muted-foreground">NFTs to Propose</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{GOVERNANCE_PARAMS.quorumPercentage}%</p>
              <p className="text-sm text-muted-foreground">Quorum Required</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
