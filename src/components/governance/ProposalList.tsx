import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGovernanceProposals, type GovernanceProposal } from "@/hooks/useGovernance";
import { PROPOSAL_STATUS, type ProposalStatus } from "@/config/governance";
import { ProposalCard } from "./ProposalCard";
import { ProposalDetailModal } from "./ProposalDetailModal";
import { FileText, Filter } from "lucide-react";

export const ProposalList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");
  const [selectedProposal, setSelectedProposal] = useState<GovernanceProposal | null>(null);
  
  const { data: proposals, isLoading } = useGovernanceProposals(
    statusFilter === "all" ? undefined : statusFilter
  );

  const filterOptions: { value: ProposalStatus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: PROPOSAL_STATUS.ACTIVE, label: "Active" },
    { value: PROPOSAL_STATUS.PENDING, label: "Pending" },
    { value: PROPOSAL_STATUS.SUCCEEDED, label: "Passed" },
    { value: PROPOSAL_STATUS.DEFEATED, label: "Failed" },
    { value: PROPOSAL_STATUS.EXECUTED, label: "Executed" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filter:</span>
        </div>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProposalStatus | "all")}>
          <TabsList>
            {filterOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="text-xs sm:text-sm">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Proposals List */}
      {proposals && proposals.length > 0 ? (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <ProposalCard 
              key={proposal.id} 
              proposal={proposal}
              onClick={() => setSelectedProposal(proposal)}
            />
          ))}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Proposals Found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {statusFilter === "all" 
                ? "There are no governance proposals yet. Be the first to create one!"
                : `No proposals with status "${statusFilter}" found.`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Proposal Detail Modal */}
      {selectedProposal && (
        <ProposalDetailModal
          proposal={selectedProposal}
          open={!!selectedProposal}
          onOpenChange={(open) => !open && setSelectedProposal(null)}
        />
      )}
    </div>
  );
};
