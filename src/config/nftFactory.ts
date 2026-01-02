// LilyPad Factory Contract Configuration for Monad Testnet
// Factory deployed at: 0x028240d2Da704C84c9D54765B7ac2793796727B6
// Implementation deployed at: 0xb02424aC92026E4222d5c367d158236546CFfD31

// Factory contract address - creates new NFT collection clones
export const NFT_FACTORY_ADDRESS = "0x028240d2Da704C84c9D54765B7ac2793796727B6";

// Implementation address used by factory for cloning
export const NFT_COLLECTION_IMPLEMENTATION = "0xb02424aC92026E4222d5c367d158236546CFfD31";

// Alias for clarity
export const THELILYPAD_LAUNCHPAD_ADDRESS = NFT_FACTORY_ADDRESS;

// LilyPad platform constants
export const LILYPAD_PLATFORM_NAME = "The Lily Pad";
export const LILYPAD_PLATFORM_VERSION = "1.0.0";

// Platform addresses
export const PLATFORM_TREASURY = "0x73BE356D8434E34bc7312559E52c76cE2140Ad2F";
export const BUYBACK_POOL = "0x8393F351546fE294B84Ab13Ea6553bdb4c24F6b5";

// Platform fee configuration
export const PLATFORM_FEE_BPS = 250; // 2.5% total platform fee
export const BUYBACK_SPLIT_BPS = 5000; // 50% of platform fee goes to buyback

// Helper function to validate IPFS CIDs
export function isValidIPFSCID(cid: string): boolean {
  if (!cid) return false;
  return (cid.startsWith('Qm') && cid.length === 46) || 
         (cid.startsWith('bafy') && cid.length >= 52);
}

// Helper to construct token URI from IPFS base CID
export function constructTokenURI(ipfsBaseCID: string, tokenId: number): string {
  return `ipfs://${ipfsBaseCID}/${tokenId}.json`;
}

// ============================================
// FACTORY ABI - For creating new collections
// ============================================
export const NFT_FACTORY_ABI = [
  // Create a new collection clone
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "maxSupply", type: "uint256" },
      { name: "baseURI", type: "string" }
    ],
    name: "createCollection",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Check if a collection was deployed by this factory
  {
    inputs: [{ name: "collection", type: "address" }],
    name: "isDeployedCollection",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  // Get all collections created by an address
  {
    inputs: [{ name: "creator", type: "address" }],
    name: "getCreatorCollections",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  // Get total collection count
  {
    inputs: [],
    name: "getCollectionCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Get implementation address
  {
    inputs: [],
    name: "implementation",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Get platform treasury
  {
    inputs: [],
    name: "platformTreasury",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Owner
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "collection", type: "address" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
      { indexed: false, name: "maxSupply", type: "uint256" }
    ],
    name: "CollectionCreated",
    type: "event"
  }
] as const;

// ============================================
// COLLECTION ABI - For deployed NFT collections
// ============================================
export const NFT_COLLECTION_ABI = [
  // View functions
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
    name: "activePhaseId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "isLilyPadCollection",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "pure",
    type: "function"
  },
  // Get phase info
  {
    inputs: [{ name: "phaseId", type: "uint256" }],
    name: "phases",
    outputs: [
      { name: "price", type: "uint256" },
      { name: "maxPerWallet", type: "uint256" },
      { name: "maxSupply", type: "uint256" },
      { name: "minted", type: "uint256" },
      { name: "requiresAllowlist", type: "bool" }
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
    name: "allowlist",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  // Get minted count per wallet per phase
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

  // ============================================
  // WRITE FUNCTIONS - Owner only
  // ============================================
  
  // Configure a mint phase
  {
    inputs: [
      { name: "phaseId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "maxPerWallet", type: "uint256" },
      { name: "maxSupply", type: "uint256" },
      { name: "requiresAllowlist", type: "bool" }
    ],
    name: "configurePhase",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Set active phase
  {
    inputs: [{ name: "phaseId", type: "uint256" }],
    name: "setActivePhase",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Set allowlist for a phase
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
  // Set base URI
  {
    inputs: [{ name: "baseURI_", type: "string" }],
    name: "setBaseURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Set max supply
  {
    inputs: [{ name: "newMaxSupply", type: "uint256" }],
    name: "setMaxSupply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Pause/unpause
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Withdraw funds
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Transfer ownership
  {
    inputs: [{ name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  // ============================================
  // MINT FUNCTIONS
  // ============================================
  
  // Public mint
  {
    inputs: [{ name: "quantity", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  // Allowlist mint
  {
    inputs: [{ name: "quantity", type: "uint256" }],
    name: "mintAllowlist",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  // Owner mint (single)
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "uri", type: "string" }
    ],
    name: "ownerMint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Owner mint batch
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "uris", type: "string[]" }
    ],
    name: "ownerMintBatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  // ============================================
  // ERC721 STANDARD FUNCTIONS
  // ============================================
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
  {
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },

  // ============================================
  // EVENTS
  // ============================================
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
      { indexed: true, name: "phaseId", type: "uint256" },
      { indexed: false, name: "price", type: "uint256" },
      { indexed: false, name: "maxPerWallet", type: "uint256" },
      { indexed: false, name: "maxSupply", type: "uint256" },
      { indexed: false, name: "requiresAllowlist", type: "bool" }
    ],
    name: "PhaseConfigured",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "phaseId", type: "uint256" }
    ],
    name: "ActivePhaseChanged",
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

// ============================================
// TYPE INTERFACES
// ============================================

// Phase interface
export interface TheLilyPadPhase {
  price: bigint;
  maxPerWallet: bigint;
  maxSupply: bigint;
  minted: bigint;
  requiresAllowlist: boolean;
}

// Platform info interface
export interface LilyPadPlatformInfo {
  platform: string;
  version: string;
  treasury: string;
  factory: string;
}

// Fee info interface
export interface LilyPadFeeInfo {
  platformFeeBps: bigint;
  buybackSplitBps: bigint;
  treasury: string;
  buyback: string;
}

// Factory deploy params
export interface FactoryDeployParams {
  name: string;
  symbol: string;
  maxSupply: number;
  baseURI: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Check if factory is configured (not zero address)
export function isFactoryConfigured(): boolean {
  return NFT_FACTORY_ADDRESS.toLowerCase() !== "0x0000000000000000000000000000000000000000";
}

// Alias for backwards compatibility
export function isTheLilyPadConfigured(): boolean {
  return isFactoryConfigured();
}

// Legacy ABI for upgradeable mints (owner safeMint with URI)
export const UPGRADEABLE_LILYPAD_ABI = [
  {
    inputs: [{ name: "initialOwner", type: "address" }],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "uri", type: "string" }
    ],
    name: "safeMint",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
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
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
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
  }
] as const;

// Calculate platform fees for a given mint cost
export function calculatePlatformFees(mintCost: bigint): {
  platformFee: bigint;
  buybackAmount: bigint;
  creatorAmount: bigint;
} {
  const platformFee = (mintCost * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
  const buybackAmount = (platformFee * BigInt(BUYBACK_SPLIT_BPS)) / BigInt(10000);
  const creatorAmount = mintCost - platformFee;
  
  return { platformFee, buybackAmount, creatorAmount };
}
