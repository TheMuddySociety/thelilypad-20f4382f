import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/providers/WalletProvider";
import { useCreateProposal, useVotingPower } from "@/hooks/useGovernance";
import { GOVERNANCE_PARAMS } from "@/config/governance";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateProposalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateProposalModal: React.FC<CreateProposalModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { address, isConnected } = useWallet();
  const { data: votingPower } = useVotingPower(address);
  const createProposal = useCreateProposal();
  const { toast } = useToast();

  const canCreate = votingPower && votingPower.votingPower >= GOVERNANCE_PARAMS.proposalThreshold;
  const threshold = GOVERNANCE_PARAMS.proposalThreshold.toLocaleString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !canCreate) return;

    setIsSubmitting(true);
    try {
      // In a real implementation, this would:
      // 1. Call the smart contract to create the proposal
      // 2. Get the proposal ID and block numbers from the transaction
      // 3. Store in database

      // For now, we create a placeholder proposal
      const mockProposalId = `0x${Date.now().toString(16)}`;
      const currentBlock = 1000000; // Would come from provider

      await createProposal.mutateAsync({
        proposal_id: mockProposalId,
        proposer_address: address.toLowerCase(),
        title,
        description,
        targets: [],
        values: [],
        calldatas: [],
        start_block: currentBlock + GOVERNANCE_PARAMS.votingDelayBlocks,
        end_block: currentBlock + GOVERNANCE_PARAMS.votingDelayBlocks + GOVERNANCE_PARAMS.votingPeriodBlocks,
        status: "pending",
      });

      toast({
        title: "Proposal Created",
        description: "Your proposal has been submitted successfully.",
      });

      setTitle("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create proposal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Proposal</DialogTitle>
          <DialogDescription>
            Submit a new governance proposal for the community to vote on.
          </DialogDescription>
        </DialogHeader>

        {!canCreate && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need at least {threshold} LILY tokens to create a proposal.
              Your current voting power: {votingPower?.votingPower.toLocaleString() || 0} LILY
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Proposal Title</Label>
            <Input
              id="title"
              placeholder="Enter a clear, concise title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your proposal in detail. Include the rationale, expected impact, and any relevant links."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={8}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/5000</p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Proposal Timeline</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Voting Delay</p>
                <p>~1 day after creation</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Voting Period</p>
                <p>~7 days</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Quorum Required</p>
                <p>4% of total supply</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Execution Delay</p>
                <p>24 hours after passing</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canCreate || isSubmitting || !title || !description}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Proposal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
