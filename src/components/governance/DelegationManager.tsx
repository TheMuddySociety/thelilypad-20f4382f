import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/providers/WalletProvider";
import { useVotingPower, useTopDelegates, type TokenHolder } from "@/hooks/useGovernance";
import { useToast } from "@/hooks/use-toast";
import { Users, ArrowRight, Search, Copy, Check } from "lucide-react";

export const DelegationManager: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { address, isConnected } = useWallet();
  const { data: votingPower } = useVotingPower(address);
  const { data: topDelegates, isLoading } = useTopDelegates(20);
  const { toast } = useToast();

  const handleDelegate = async (delegateAddress: string) => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to delegate voting power.",
        variant: "destructive",
      });
      return;
    }

    // In a real implementation, this would call the token contract's delegate function
    toast({
      title: "Delegation Initiated",
      description: `Delegating voting power to ${delegateAddress.slice(0, 6)}...${delegateAddress.slice(-4)}`,
    });
  };

  const handleSelfDelegate = () => {
    if (address) {
      handleDelegate(address);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const filteredDelegates = topDelegates?.filter(
    (d) => d.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Your Delegation Status */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Your Delegation</CardTitle>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Your Balance</p>
                  <p className="text-2xl font-bold">{votingPower?.balance.toLocaleString() || 0} LILY</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Voting Power</p>
                  <p className="text-2xl font-bold">{votingPower?.votingPower.toLocaleString() || 0} LILY</p>
                </div>
              </div>

              {votingPower?.delegatedTo ? (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Currently Delegated To</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{truncateAddress(votingPower.delegatedTo)}</span>
                    <Button variant="outline" size="sm" onClick={handleSelfDelegate}>
                      Reclaim
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSelfDelegate} className="flex-1">
                    Self-Delegate
                  </Button>
                  <p className="text-sm text-muted-foreground self-center">
                    or choose a delegate below
                  </p>
                </div>
              )}

              {votingPower?.isDelegate && (
                <Badge variant="secondary" className="w-fit">
                  <Users className="w-3 h-3 mr-1" />
                  You have {votingPower.delegatorsCount} delegators
                </Badge>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>Connect your wallet to manage delegation</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Delegates */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Top Delegates</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredDelegates && filteredDelegates.length > 0 ? (
            <div className="space-y-3">
              {filteredDelegates.map((delegate, index) => (
                <div
                  key={delegate.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{truncateAddress(delegate.wallet_address)}</span>
                        <button
                          onClick={() => copyAddress(delegate.wallet_address)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedAddress === delegate.wallet_address ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {delegate.delegators_count} delegators
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{delegate.voting_power.toLocaleString()} LILY</p>
                      <p className="text-sm text-muted-foreground">Voting Power</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelegate(delegate.wallet_address)}
                      disabled={!isConnected || delegate.wallet_address.toLowerCase() === address?.toLowerCase()}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No delegates found</p>
              {searchQuery && <p className="text-sm">Try a different search query</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
