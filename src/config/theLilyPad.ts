// TheLilyPad Contract Configuration for Monad Testnet
// Deployed at: 0x979C95F379B905a1Cb394FEC130d260BaCFC230d

// Contract address on Monad Testnet
export const THELILYPAD_CONTRACT_ADDRESS = "0x979C95F379B905a1Cb394FEC130d260BaCFC230d";

// Platform constants (from contract)
export const LILYPAD_PLATFORM_NAME = "LilyPad";
export const LILYPAD_VERSION = "1.0.0";

// Platform fee configuration (from contract)
export const PLATFORM_FEE_BPS = 250; // 2.5% total platform fee
export const BUYBACK_SPLIT_BPS = 5000; // 50% of platform fee goes to buyback

// TheLilyPad Contract ABI
export const THELILYPAD_ABI = [
  // View functions
  {
    inputs: [],
    name: "PLATFORM_NAME",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "VERSION",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "maxSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "baseURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "platformTreasury",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "buybackPool",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "activePhase",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "royaltyBps",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "royaltyReceiver",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Check if LilyPad collection
  {
    inputs: [],
    name: "isLilyPadCollection",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "pure",
    type: "function"
  },
  // Get platform info
  {
    inputs: [],
    name: "getPlatformInfo",
    outputs: [
      { name: "platform", type: "string" },
      { name: "version", type: "string" },
      { name: "treasury", type: "address" },
      { name: "buyback", type: "address" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Get fee info
  {
    inputs: [],
    name: "getFeeInfo",
    outputs: [
      { name: "platformFeeBps", type: "uint256" },
      { name: "buybackSplitBps", type: "uint256" },
      { name: "treasury", type: "address" },
      { name: "buyback", type: "address" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Get phase info
  {
    inputs: [{ name: "phaseId", type: "uint256" }],
    name: "getPhase",
    outputs: [
      { name: "price", type: "uint256" },
      { name: "maxPerWallet", type: "uint256" },
      { name: "phaseMaxSupply", type: "uint256" },
      { name: "phaseMinted", type: "uint256" },
      { name: "isActive", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Get phases mapping
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "phases",
    outputs: [
      { name: "price", type: "uint256" },
      { name: "maxPerWallet", type: "uint256" },
      { name: "maxSupply", type: "uint256" },
      { name: "minted", type: "uint256" },
      { name: "isActive", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Check allowlist status
  {
    inputs: [
      { name: "phaseId", type: "uint256" },
      { name: "account", type: "address" }
    ],
    name: "allowlisted",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  // Get minted per phase per wallet
  {
    inputs: [
      { name: "phaseId", type: "uint256" },
      { name: "account", type: "address" }
    ],
    name: "mintedPerPhase",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Calculate fees
  {
    inputs: [{ name: "quantity", type: "uint256" }],
    name: "calculateFees",
    outputs: [
      { name: "totalCost", type: "uint256" },
      { name: "platformFee", type: "uint256" },
      { name: "buybackAmount", type: "uint256" },
      { name: "creatorAmount", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Token URI
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  // Balance of
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Owner of
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Royalty info
  {
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "salePrice", type: "uint256" }
    ],
    name: "royaltyInfo",
    outputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Supports interface
  {
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "pure",
    type: "function"
  },

  // Write functions - Minting
  {
    inputs: [
      { name: "quantity", type: "uint256" },
      { name: "proof", type: "bytes32[]" }
    ],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ name: "quantity", type: "uint256" }],
    name: "mintPublic",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },

  // Write functions - Owner only
  {
    inputs: [
      { name: "phaseId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "maxPerWallet", type: "uint256" },
      { name: "phaseMaxSupply", type: "uint256" }
    ],
    name: "configurePhase",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "phaseId", type: "uint256" }],
    name: "setActivePhase",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "phaseId", type: "uint256" },
      { name: "addresses", type: "address[]" },
      { name: "status", type: "bool" }
    ],
    name: "setAllowlist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "_baseURI", type: "string" }],
    name: "setBaseURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  // ERC721 transfer functions
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "data", type: "bytes" }
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" }
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "getApproved",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" }
    ],
    name: "isApprovedForAll",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" }
    ],
    name: "Transfer",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "approved", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" }
    ],
    name: "Approval",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "operator", type: "address" },
      { indexed: false, name: "approved", type: "bool" }
    ],
    name: "ApprovalForAll",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "collection", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "creator", type: "address" }
    ],
    name: "LilyPadCollectionCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "phaseId", type: "uint256" },
      { indexed: false, name: "price", type: "uint256" },
      { indexed: false, name: "maxPerWallet", type: "uint256" }
    ],
    name: "PhaseConfigured",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "phaseId", type: "uint256" }
    ],
    name: "Minted",
    type: "event"
  }
] as const;

// Phase interface
export interface TheLilyPadPhase {
  price: bigint;
  maxPerWallet: bigint;
  maxSupply: bigint;
  minted: bigint;
  isActive: boolean;
}

// Platform info interface
export interface TheLilyPadPlatformInfo {
  platform: string;
  version: string;
  treasury: string;
  buyback: string;
}

// Fee info interface
export interface TheLilyPadFeeInfo {
  platformFeeBps: bigint;
  buybackSplitBps: bigint;
  treasury: string;
  buyback: string;
}

// Helper to check if contract is configured
export function isTheLilyPadConfigured(): boolean {
  return THELILYPAD_CONTRACT_ADDRESS.toLowerCase() !== "0x0000000000000000000000000000000000000000";
}
