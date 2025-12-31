// NFT Factory Contract Configuration for Monad Testnet
// LilyPad NFT Factory - deploys new NFT collections with platform identification

// Factory contract address on Monad Testnet
// NOTE: Replace this with the actual deployed factory address when available
export const NFT_FACTORY_ADDRESS = "0x0000000000000000000000000000000000000000";

// LilyPad platform constants
export const LILYPAD_PLATFORM_NAME = "LilyPad";
export const LILYPAD_PLATFORM_VERSION = "1.0.0";

// Platform fee configuration (matches LilyPadNFT.sol)
export const PLATFORM_FEE_BPS = 250; // 2.5% total platform fee
export const BUYBACK_SPLIT_BPS = 5000; // 50% of platform fee goes to buyback

// LilyPad NFT Factory ABI - includes platform identification features
export const NFT_FACTORY_ABI = [
  // Constructor (for reference when deploying)
  {
    inputs: [
      { name: "_platformTreasury", type: "address" },
      { name: "_buybackPool", type: "address" }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  // Create a new NFT collection with LilyPad identification
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "maxSupply", type: "uint256" },
      { name: "royaltyBps", type: "uint256" },
      { name: "royaltyReceiver", type: "address" }
    ],
    name: "createCollection",
    outputs: [{ name: "collection", type: "address" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Alternative function name some factories use
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "maxSupply", type: "uint256" },
      { name: "royaltyBps", type: "uint256" },
      { name: "royaltyReceiver", type: "address" }
    ],
    name: "deployCollection",
    outputs: [{ name: "collection", type: "address" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // LilyPad Collection Deployed Event
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "collection", type: "address" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
      { indexed: false, name: "maxSupply", type: "uint256" },
      { indexed: false, name: "royaltyBps", type: "uint256" },
      { indexed: false, name: "royaltyReceiver", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
      { indexed: true, name: "chainId", type: "uint256" }
    ],
    name: "LilyPadCollectionDeployed",
    type: "event"
  },
  // Legacy CollectionCreated event for backwards compatibility
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "collection", type: "address" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" }
    ],
    name: "CollectionCreated",
    type: "event"
  },
  // Platform Addresses Updated Event
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "oldTreasury", type: "address" },
      { indexed: true, name: "newTreasury", type: "address" },
      { indexed: false, name: "oldBuyback", type: "address" },
      { indexed: false, name: "newBuyback", type: "address" }
    ],
    name: "PlatformAddressesUpdated",
    type: "event"
  },
  // View function to get collections by creator
  {
    inputs: [{ name: "creator", type: "address" }],
    name: "getCollectionsByCreator",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  // Verify if collection was deployed via LilyPad
  {
    inputs: [{ name: "collection", type: "address" }],
    name: "verifyCollection",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  // Get factory platform info
  {
    inputs: [],
    name: "getFactoryInfo",
    outputs: [
      { name: "platformName", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "totalCollections", type: "uint256" },
      { name: "active", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Get platform addresses
  {
    inputs: [],
    name: "getPlatformAddresses",
    outputs: [
      { name: "treasury", type: "address" },
      { name: "buyback", type: "address" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Platform treasury address
  {
    inputs: [],
    name: "platformTreasury",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Buyback pool address
  {
    inputs: [],
    name: "buybackPool",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Platform name constant
  {
    inputs: [],
    name: "PLATFORM_NAME",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  // Factory version constant
  {
    inputs: [],
    name: "VERSION",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  // Check if factory is active
  {
    inputs: [],
    name: "isActive",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  // Update platform addresses (admin only)
  {
    inputs: [
      { name: "_platformTreasury", type: "address" },
      { name: "_buybackPool", type: "address" }
    ],
    name: "updatePlatformAddresses",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Get all collections
  {
    inputs: [],
    name: "getAllCollections",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  // Get collection count
  {
    inputs: [],
    name: "getCollectionCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Factory owner
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// LilyPad NFT Collection ABI - for deployed collection contracts
export const LILYPAD_NFT_ABI = [
  // Platform identification
  {
    inputs: [],
    name: "PLATFORM_NAME",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "PLATFORM_VERSION",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  // Check if this is a LilyPad collection
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
      { name: "website", type: "string" },
      { name: "factoryAddress", type: "address" },
      { name: "deployedChainId", type: "uint256" },
      { name: "deployedAt", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Get fee info
  {
    inputs: [],
    name: "getFeeInfo",
    outputs: [
      { name: "treasury", type: "address" },
      { name: "buyback", type: "address" },
      { name: "feeBps", type: "uint256" },
      { name: "buybackSplitBps", type: "uint256" },
      { name: "totalCollected", type: "uint256" },
      { name: "totalToBuyback", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Calculate fees for minting
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
  // Contract-level metadata URI
  {
    inputs: [],
    name: "contractURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  // Factory reference
  {
    inputs: [],
    name: "factory",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Chain ID deployed on
  {
    inputs: [],
    name: "deployedOnChainId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Platform treasury
  {
    inputs: [],
    name: "platformTreasury",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Buyback pool
  {
    inputs: [],
    name: "buybackPool",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  // Platform Fee Paid Event
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "minter", type: "address" },
      { indexed: false, name: "totalPaid", type: "uint256" },
      { indexed: false, name: "platformFee", type: "uint256" },
      { indexed: false, name: "toBuyback", type: "uint256" }
    ],
    name: "PlatformFeePaid",
    type: "event"
  },
  // Mint With Fee Event
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "minter", type: "address" },
      { indexed: false, name: "quantity", type: "uint256" },
      { indexed: false, name: "totalCost", type: "uint256" },
      { indexed: false, name: "platformFee", type: "uint256" },
      { indexed: false, name: "firstTokenId", type: "uint256" }
    ],
    name: "MintWithFee",
    type: "event"
  }
] as const;

// Deployment parameters interface
export interface FactoryDeployParams {
  name: string;
  symbol: string;
  maxSupply: number;
  royaltyBps: number;
  royaltyReceiver: string;
}

// LilyPad platform info interface
export interface LilyPadPlatformInfo {
  platform: string;
  version: string;
  website: string;
  factory: string;
  chainId: number;
  deployedAt: number;
}

// Fee info interface
export interface LilyPadFeeInfo {
  treasury: string;
  buyback: string;
  feeBps: number;
  buybackSplitBps: number;
  totalCollected: bigint;
  totalToBuyback: bigint;
}

// Helper to encode createCollection function call
export function encodeCreateCollection(params: FactoryDeployParams): string {
  const { encodeFunctionData } = require('viem');
  
  return encodeFunctionData({
    abi: NFT_FACTORY_ABI,
    functionName: 'createCollection',
    args: [
      params.name,
      params.symbol,
      BigInt(params.maxSupply),
      BigInt(params.royaltyBps * 100), // Convert percentage to basis points
      params.royaltyReceiver as `0x${string}`
    ]
  });
}

// Check if factory is configured (not zero address)
export function isFactoryConfigured(): boolean {
  return NFT_FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000";
}

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

// Verify if an address is a LilyPad collection
export async function verifyLilyPadCollection(
  collectionAddress: string,
  provider: any
): Promise<boolean> {
  if (!isFactoryConfigured()) return false;
  
  try {
    // Call verifyCollection on factory
    const result = await provider.request({
      method: 'eth_call',
      params: [{
        to: NFT_FACTORY_ADDRESS,
        data: `0x${encodeVerifyCollection(collectionAddress)}`
      }, 'latest']
    });
    
    return result === '0x0000000000000000000000000000000000000000000000000000000000000001';
  } catch {
    return false;
  }
}

// Helper to encode verifyCollection call
function encodeVerifyCollection(address: string): string {
  // Function selector for verifyCollection(address)
  const selector = 'a217fddf'; // keccak256("verifyCollection(address)") first 4 bytes
  const paddedAddress = address.slice(2).padStart(64, '0');
  return selector + paddedAddress;
}
