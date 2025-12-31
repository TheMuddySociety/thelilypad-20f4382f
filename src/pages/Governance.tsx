import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { GovernanceStats } from "@/components/governance/GovernanceStats";
import { ProposalList } from "@/components/governance/ProposalList";
import { TokenStats } from "@/components/governance/TokenStats";
import { DelegationManager } from "@/components/governance/DelegationManager";
import { CreateProposalModal } from "@/components/governance/CreateProposalModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Vote, Users, Coins, Settings } from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import { useVotingPower, useGovernanceConfig } from "@/hooks/useGovernance";
import { GOVERNANCE_PARAMS } from "@/config/governance";

const Governance: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { address, isConnected } = useWallet();
  const { data: votingPower } = useVotingPower(address);
  const { data: config } = useGovernanceConfig();

  const canCreateProposal = votingPower && (votingPower.nftCount || 0) >= GOVERNANCE_PARAMS.proposalThresholdNFTs;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="gradient-text">DAO Governance</span>
            </h1>
            <p className="text-muted-foreground">
              Vote on proposals, delegate your voting power, and shape the future of The Lily Pad
            </p>
          </div>
          
          {isConnected && (
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!canCreateProposal}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Proposal
            </Button>
          )}
        </div>

        {/* Governance Stats */}
        <GovernanceStats />

        {/* Main Content Tabs */}
        <Tabs defaultValue="proposals" className="mt-8">
          <TabsList className="grid w-full max-w-md grid-cols-4 mb-6">
            <TabsTrigger value="proposals" className="gap-2">
              <Vote className="w-4 h-4" />
              <span className="hidden sm:inline">Proposals</span>
            </TabsTrigger>
            <TabsTrigger value="delegates" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Delegates</span>
            </TabsTrigger>
            <TabsTrigger value="tokens" className="gap-2">
              <Coins className="w-4 h-4" />
              <span className="hidden sm:inline">Token</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proposals">
            <ProposalList />
          </TabsContent>

          <TabsContent value="delegates">
            <DelegationManager />
          </TabsContent>

          <TabsContent value="tokens">
            <TokenStats />
          </TabsContent>

          <TabsContent value="settings">
            <div className="glass-card p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Governance Configuration</h3>
              {config ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Voting Delay</p>
                    <p className="font-semibold">{config.voting_delay_blocks.toLocaleString()} blocks (~1 day)</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Voting Period</p>
                    <p className="font-semibold">{config.voting_period_blocks.toLocaleString()} blocks (~7 days)</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Proposal Threshold</p>
                    <p className="font-semibold">{config.proposal_threshold.toLocaleString()} LILY</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Quorum</p>
                    <p className="font-semibold">{config.quorum_percentage}% of total supply</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Timelock Delay</p>
                    <p className="font-semibold">{config.timelock_delay_seconds / 3600} hours</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Chain ID</p>
                    <p className="font-semibold">{config.chain_id}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Governance contracts not yet deployed.</p>
                  <p className="text-sm mt-2">Default parameters will be used:</p>
                  <div className="grid grid-cols-2 gap-4 mt-4 max-w-md mx-auto">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Voting Delay</p>
                      <p className="font-medium">~1 day</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Voting Period</p>
                      <p className="font-medium">~7 days</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Threshold</p>
                      <p className="font-medium">100K LILY</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Quorum</p>
                      <p className="font-medium">4%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <CreateProposalModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </div>
  );
};

export default Governance;
