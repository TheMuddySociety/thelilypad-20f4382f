import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type GovernanceProposal } from "@/hooks/useGovernance";
import { PROPOSAL_STATUS } from "@/config/governance";
import { Clock, CheckCircle2, XCircle, Timer, Play, Pause, Archive } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProposalCardProps {
  proposal: GovernanceProposal;
  onClick?: () => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onClick }) => {
  const totalVotes = proposal.for_votes + proposal.against_votes + proposal.abstain_votes;
  const forPercentage = totalVotes > 0 ? (proposal.for_votes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.against_votes / totalVotes) * 100 : 0;

  const getStatusBadge = () => {
    switch (proposal.status) {
      case PROPOSAL_STATUS.ACTIVE:
        return <Badge className="bg-primary/20 text-primary border-primary/30"><Play className="w-3 h-3 mr-1" />Active</Badge>;
      case PROPOSAL_STATUS.PENDING:
        return <Badge variant="secondary"><Timer className="w-3 h-3 mr-1" />Pending</Badge>;
      case PROPOSAL_STATUS.SUCCEEDED:
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Passed</Badge>;
      case PROPOSAL_STATUS.DEFEATED:
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case PROPOSAL_STATUS.QUEUED:
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
      case PROPOSAL_STATUS.EXECUTED:
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Executed</Badge>;
      case PROPOSAL_STATUS.CANCELED:
        return <Badge variant="outline"><Pause className="w-3 h-3 mr-1" />Canceled</Badge>;
      case PROPOSAL_STATUS.EXPIRED:
        return <Badge variant="outline"><Archive className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{proposal.status}</Badge>;
    }
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <Card 
      className="glass-card hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge()}
              <span className="text-xs text-muted-foreground">
                by {truncateAddress(proposal.proposer_address)}
              </span>
            </div>
            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
              {proposal.title}
            </h3>
          </div>
          <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
            <Clock className="w-4 h-4 inline mr-1" />
            {formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })}
          </div>
        </div>

        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {proposal.description.substring(0, 200)}...
        </p>

        {/* Voting Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-500 font-medium">
              For: {forPercentage.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">
              {totalVotes.toLocaleString()} votes
            </span>
            <span className="text-red-500 font-medium">
              Against: {againstPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex">
            <div 
              className="bg-green-500 transition-all" 
              style={{ width: `${forPercentage}%` }}
            />
            <div 
              className="bg-muted-foreground/30 transition-all" 
              style={{ width: `${100 - forPercentage - againstPercentage}%` }}
            />
            <div 
              className="bg-red-500 transition-all" 
              style={{ width: `${againstPercentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
