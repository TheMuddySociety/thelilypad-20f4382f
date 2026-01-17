import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type GovernanceProposal, useProposalDetail, useHasVoted, useRecordVote, useVotingPower } from "@/hooks/useGovernance";
import { PROPOSAL_STATUS, VOTE_SUPPORT } from "@/config/governance";
import { useWallet } from "@/providers/WalletProvider";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, MinusCircle, Clock, ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface ProposalDetailModalProps {
  proposal: GovernanceProposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProposalDetailModal: React.FC<ProposalDetailModalProps> = ({
  proposal,
  open,
  onOpenChange,
}) => {
  const [voteReason, setVoteReason] = useState("");
  const [isVoting, setIsVoting] = useState(false);
  const { address, isConnected } = useWallet();
  const { toast } = useToast();

  const { data: detailData, isLoading } = useProposalDetail(proposal.id);
  const { data: hasVoted } = useHasVoted(proposal.id, address);
  const { data: votingPower } = useVotingPower(address);
  const recordVote = useRecordVote();

  const totalVotes = proposal.for_votes + proposal.against_votes + proposal.abstain_votes;
  const isActive = proposal.status === PROPOSAL_STATUS.ACTIVE;
  const canVote = isConnected && isActive && !hasVoted && votingPower && votingPower.votingPower > 0;

  const handleVote = async (support: number) => {
    if (!address || !canVote) return;

    setIsVoting(true);
    try {
      // In a real implementation, this would call the smart contract first
      // For now, we just record the vote in the database
      await recordVote.mutateAsync({
        proposal_id: proposal.id,
        voter_address: address.toLowerCase(),
        support,
        weight: votingPower?.votingPower || 0,
        reason: voteReason || undefined,
      });

      toast({
        title: "Vote Cast Successfully",
        description: `Your vote has been recorded${voteReason ? " with reason" : ""}.`,
      });
      setVoteReason("");
    } catch (error) {
      toast({
        title: "Vote Failed",
        description: "Failed to cast your vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge className="mb-2">{proposal.status}</Badge>
              <DialogTitle className="text-xl">{proposal.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Proposer Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Proposed by {truncateAddress(proposal.proposer_address)}</span>
              <span>•</span>
              <Clock className="w-4 h-4" />
              <span>{formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })}</span>
            </div>

            {/* Description */}
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{proposal.description}</p>
            </div>

            <Separator />

            {/* Voting Stats */}
            <div>
              <h4 className="font-semibold mb-4">Voting Results</h4>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-green-500/10 rounded-lg text-center">
                  <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold text-green-500">{proposal.for_votes.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">For</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <MinusCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{proposal.abstain_votes.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Abstain</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-lg text-center">
                  <ThumbsDown className="w-6 h-6 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold text-red-500">{proposal.against_votes.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Against</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                {totalVotes > 0 ? (
                  <>
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${(proposal.for_votes / totalVotes) * 100}%` }}
                    />
                    <div 
                      className="bg-muted-foreground/30" 
                      style={{ width: `${(proposal.abstain_votes / totalVotes) * 100}%` }}
                    />
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(proposal.against_votes / totalVotes) * 100}%` }}
                    />
                  </>
                ) : (
                  <div className="w-full bg-muted-foreground/20" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Total: {totalVotes.toLocaleString()} votes
              </p>
            </div>

            <Separator />

            {/* Cast Vote Section */}
            {canVote && (
              <div>
                <h4 className="font-semibold mb-4">Cast Your Vote</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Your voting power: <span className="font-semibold text-foreground">{votingPower?.votingPower.toLocaleString()} LILY</span>
                </p>
                
                <Textarea
                  placeholder="Add a reason for your vote (optional)"
                  value={voteReason}
                  onChange={(e) => setVoteReason(e.target.value)}
                  className="mb-4"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleVote(VOTE_SUPPORT.FOR)}
                    disabled={isVoting}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    {isVoting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                    Vote For
                  </Button>
                  <Button
                    onClick={() => handleVote(VOTE_SUPPORT.ABSTAIN)}
                    disabled={isVoting}
                    variant="outline"
                    className="flex-1"
                  >
                    {isVoting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MinusCircle className="w-4 h-4 mr-2" />}
                    Abstain
                  </Button>
                  <Button
                    onClick={() => handleVote(VOTE_SUPPORT.AGAINST)}
                    disabled={isVoting}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isVoting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
                    Vote Against
                  </Button>
                </div>
              </div>
            )}

            {hasVoted && (
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-primary font-medium">You have already voted on this proposal</p>
              </div>
            )}

            {!isConnected && (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-muted-foreground">Connect your wallet to vote on this proposal</p>
              </div>
            )}

            {/* Recent Votes */}
            {detailData?.votes && detailData.votes.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-4">Recent Votes</h4>
                  <div className="space-y-2">
                    {detailData.votes.slice(0, 10).map((vote) => (
                      <div key={vote.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          {vote.support === VOTE_SUPPORT.FOR && <ThumbsUp className="w-4 h-4 text-green-500" />}
                          {vote.support === VOTE_SUPPORT.AGAINST && <ThumbsDown className="w-4 h-4 text-red-500" />}
                          {vote.support === VOTE_SUPPORT.ABSTAIN && <MinusCircle className="w-4 h-4 text-muted-foreground" />}
                          <span className="font-mono text-sm">{truncateAddress(vote.voter_address)}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{vote.weight.toLocaleString()} LILY</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Transaction Info */}
            {proposal.tx_hash && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Transaction:</span>
                <a 
                    href={`https://explorer.solana.com/tx/${proposal.tx_hash}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {truncateAddress(proposal.tx_hash)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
