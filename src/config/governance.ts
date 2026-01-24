// NFT-based Governance configuration - Solana Migration
export const GOVERNANCE_CONFIG = {
  // Configs removed for Solana migration
  testnet: {
    chainId: 0,
    governorAddress: "",
    timelockAddress: "",
    rpcUrl: "",
    explorerUrl: "",
  },
  mainnet: {
    chainId: 0,
    governorAddress: "",
    timelockAddress: "",
    rpcUrl: "",
    explorerUrl: "",
  },
};

// NFT Voting Power Tiers
export const NFT_VOTING_TIERS = {
  common: 1,
  rare: 3,
  legendary: 10,
} as const;

export type NFTRarityTier = keyof typeof NFT_VOTING_TIERS;

// Governance parameters (NFT-based)
export const GOVERNANCE_PARAMS = {
  votingDelayBlocks: 7200, // ~1 day
  votingPeriodBlocks: 50400, // ~7 days
  proposalThresholdNFTs: 10, // Minimum 10 NFTs to create proposal
  quorumPercentage: 10, // 10% of total NFT voting power
  timelockDelaySeconds: 86400, // 24 hours
};

// Vote support values
export const VOTE_SUPPORT = {
  AGAINST: 0,
  FOR: 1,
  ABSTAIN: 2,
} as const;

// Proposal status mapping
export const PROPOSAL_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  CANCELED: 'canceled',
  DEFEATED: 'defeated',
  SUCCEEDED: 'succeeded',
  QUEUED: 'queued',
  EXECUTED: 'executed',
  EXPIRED: 'expired',
} as const;

export type ProposalStatus = typeof PROPOSAL_STATUS[keyof typeof PROPOSAL_STATUS];
export type VoteSupport = typeof VOTE_SUPPORT[keyof typeof VOTE_SUPPORT];
