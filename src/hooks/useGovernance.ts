import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/providers/WalletProvider";
import { PROPOSAL_STATUS, type ProposalStatus } from "@/config/governance";

export interface GovernanceProposal {
  id: string;
  proposal_id: string;
  proposer_address: string;
  title: string;
  description: string;
  targets: string[];
  values: string[];
  calldatas: string[];
  start_block: number;
  end_block: number;
  status: ProposalStatus;
  for_votes: number;
  against_votes: number;
  abstain_votes: number;
  quorum_votes: number;
  created_at: string;
  executed_at?: string;
  queued_at?: string;
  canceled_at?: string;
  tx_hash?: string;
  execution_tx_hash?: string;
}

export interface GovernanceVote {
  id: string;
  proposal_id: string;
  voter_address: string;
  voter_id?: string;
  support: number;
  weight: number;
  reason?: string;
  tx_hash?: string;
  created_at: string;
}

export interface TokenHolder {
  id: string;
  wallet_address: string;
  user_id?: string;
  balance: number;
  voting_power: number;
  delegated_to?: string;
  is_delegate: boolean;
  delegators_count: number;
  updated_at: string;
}

export interface GovernanceConfig {
  id: string;
  token_address?: string;
  governor_address: string;
  timelock_address: string;
  chain_id: number;
  voting_delay_blocks: number;
  voting_period_blocks: number;
  proposal_threshold: number;
  quorum_percentage: number;
  timelock_delay_seconds: number;
  is_active: boolean;
  governance_collection_id?: string;
  governance_type?: string;
  nft_voting_tiers?: unknown;
}

// Fetch all proposals
export function useGovernanceProposals(status?: ProposalStatus) {
  return useQuery({
    queryKey: ["governance-proposals", status],
    queryFn: async () => {
      let query = supabase
        .from("governance_proposals")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GovernanceProposal[];
    },
  });
}

// Fetch single proposal with votes
export function useProposalDetail(proposalId: string) {
  return useQuery({
    queryKey: ["governance-proposal", proposalId],
    queryFn: async () => {
      const { data: proposal, error: proposalError } = await supabase
        .from("governance_proposals")
        .select("*")
        .eq("id", proposalId)
        .single();

      if (proposalError) throw proposalError;

      const { data: votes, error: votesError } = await supabase
        .from("governance_votes")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: false });

      if (votesError) throw votesError;

      return {
        proposal: proposal as GovernanceProposal,
        votes: votes as GovernanceVote[],
      };
    },
    enabled: !!proposalId,
  });
}

// Fetch user's voting power (NFT-based)
export function useVotingPower(address?: string) {
  return useQuery({
    queryKey: ["voting-power", address],
    queryFn: async () => {
      if (!address) return { 
        balance: 0, 
        votingPower: 0, 
        delegatedTo: null,
        nftCount: 0,
        nftIds: [] as string[],
        rarityBreakdown: { common: 0, rare: 0, legendary: 0 }
      };

      const { data, error } = await supabase
        .from("governance_token_holders")
        .select("*")
        .eq("wallet_address", address.toLowerCase())
        .single();

      if (error && error.code !== "PGRST116") throw error;

      const rarityBreakdown = (data?.rarity_breakdown as { common: number; rare: number; legendary: number }) || { common: 0, rare: 0, legendary: 0 };

      return {
        balance: data?.balance || 0,
        votingPower: data?.voting_power || 0,
        delegatedTo: data?.delegated_to || null,
        isDelegate: data?.is_delegate || false,
        delegatorsCount: data?.delegators_count || 0,
        nftCount: data?.nft_count || 0,
        nftIds: (data?.nft_ids as string[]) || [],
        rarityBreakdown,
      };
    },
    enabled: !!address,
  });
}

// Fetch top token holders / delegates
export function useTopDelegates(limit = 10) {
  return useQuery({
    queryKey: ["top-delegates", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_token_holders")
        .select("*")
        .eq("is_delegate", true)
        .order("voting_power", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as TokenHolder[];
    },
  });
}

// Fetch governance config
export function useGovernanceConfig() {
  return useQuery({
    queryKey: ["governance-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("governance_config")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as GovernanceConfig | null;
    },
  });
}

// Check if user has voted on a proposal
export function useHasVoted(proposalId: string, voterAddress?: string) {
  return useQuery({
    queryKey: ["has-voted", proposalId, voterAddress],
    queryFn: async () => {
      if (!voterAddress) return false;

      const { data, error } = await supabase
        .from("governance_votes")
        .select("id")
        .eq("proposal_id", proposalId)
        .eq("voter_address", voterAddress.toLowerCase())
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    },
    enabled: !!proposalId && !!voterAddress,
  });
}

// Create a new proposal (database entry after on-chain tx)
export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposal: Omit<GovernanceProposal, "id" | "created_at" | "for_votes" | "against_votes" | "abstain_votes" | "quorum_votes">) => {
      const { data, error } = await supabase
        .from("governance_proposals")
        .insert(proposal)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-proposals"] });
    },
  });
}

// Record a vote (after on-chain tx)
export function useRecordVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vote: Omit<GovernanceVote, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("governance_votes")
        .insert(vote)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["governance-proposal", variables.proposal_id] });
      queryClient.invalidateQueries({ queryKey: ["has-voted", variables.proposal_id] });
    },
  });
}

// Get governance stats
export function useGovernanceStats() {
  return useQuery({
    queryKey: ["governance-stats"],
    queryFn: async () => {
      const [proposalsResult, holdersResult] = await Promise.all([
        supabase.from("governance_proposals").select("status", { count: "exact" }),
        supabase.from("governance_token_holders").select("voting_power", { count: "exact" }),
      ]);

      const activeProposals = proposalsResult.data?.filter(p => p.status === "active").length || 0;
      const totalProposals = proposalsResult.count || 0;
      const totalHolders = holdersResult.count || 0;
      const totalVotingPower = holdersResult.data?.reduce((sum, h) => sum + Number(h.voting_power), 0) || 0;

      return {
        activeProposals,
        totalProposals,
        totalHolders,
        totalVotingPower,
      };
    },
  });
}
