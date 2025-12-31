// Governance contract configuration
export const GOVERNANCE_CONFIG = {
  // Monad Testnet
  testnet: {
    chainId: 10143,
    tokenAddress: "", // Deploy and fill in
    governorAddress: "", // Deploy and fill in
    timelockAddress: "", // Deploy and fill in
    rpcUrl: "https://testnet-rpc.monad.xyz",
    explorerUrl: "https://testnet.monadexplorer.com",
  },
  // Monad Mainnet (future)
  mainnet: {
    chainId: 1, // Update when mainnet launches
    tokenAddress: "",
    governorAddress: "",
    timelockAddress: "",
    rpcUrl: "",
    explorerUrl: "",
  },
};

// Governance parameters
export const GOVERNANCE_PARAMS = {
  votingDelayBlocks: 7200, // ~1 day
  votingPeriodBlocks: 50400, // ~7 days
  proposalThreshold: 100000, // 100,000 LILY tokens
  quorumPercentage: 4, // 4% of total supply
  timelockDelaySeconds: 86400, // 24 hours
  maxSupply: 100_000_000, // 100M LILY
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

// ABI for LilyPadToken
export const LILY_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function delegate(address delegatee)",
  "function delegates(address account) view returns (address)",
  "function getVotes(address account) view returns (uint256)",
  "function getPastVotes(address account, uint256 blockNumber) view returns (uint256)",
  "function getPastTotalSupply(uint256 blockNumber) view returns (uint256)",
  "event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)",
  "event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
] as const;

// ABI for LilyPadGovernor
export const GOVERNOR_ABI = [
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function quorum(uint256 blockNumber) view returns (uint256)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalSnapshot(uint256 proposalId) view returns (uint256)",
  "function proposalDeadline(uint256 proposalId) view returns (uint256)",
  "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
  "function hasVoted(uint256 proposalId, address account) view returns (bool)",
  "function getVotes(address account, uint256 blockNumber) view returns (uint256)",
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)",
  "function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
  "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
  "function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
  "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)",
  "event ProposalQueued(uint256 proposalId, uint256 eta)",
  "event ProposalExecuted(uint256 proposalId)",
  "event ProposalCanceled(uint256 proposalId)",
] as const;

// ABI for LilyPadTimelock
export const TIMELOCK_ABI = [
  "function getMinDelay() view returns (uint256)",
  "function isOperationReady(bytes32 id) view returns (bool)",
  "function isOperationPending(bytes32 id) view returns (bool)",
  "function isOperationDone(bytes32 id) view returns (bool)",
  "function getTimestamp(bytes32 id) view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function PROPOSER_ROLE() view returns (bytes32)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function CANCELLER_ROLE() view returns (bytes32)",
] as const;
