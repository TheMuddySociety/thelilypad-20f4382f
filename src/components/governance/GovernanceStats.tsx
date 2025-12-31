import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGovernanceStats } from "@/hooks/useGovernance";
import { Vote, FileText, Users, Coins } from "lucide-react";

export const GovernanceStats: React.FC = () => {
  const { data: stats, isLoading } = useGovernanceStats();

  const statItems = [
    {
      label: "Active Proposals",
      value: stats?.activeProposals || 0,
      icon: Vote,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Total Proposals",
      value: stats?.totalProposals || 0,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Token Holders",
      value: stats?.totalHolders || 0,
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Total Voting Power",
      value: stats?.totalVotingPower 
        ? `${(stats.totalVotingPower / 1_000_000).toFixed(1)}M` 
        : "0",
      icon: Coins,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4">
              <Skeleton className="h-10 w-10 rounded-full mb-3" />
              <Skeleton className="h-6 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className="glass-card hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className={`w-10 h-10 rounded-full ${item.bgColor} flex items-center justify-center mb-3`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-sm text-muted-foreground">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
