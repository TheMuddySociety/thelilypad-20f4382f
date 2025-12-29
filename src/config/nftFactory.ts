// NFT Factory Contract Configuration for Monad Testnet
// Factory contracts deploy new NFT collections via a single function call

// Factory contract address on Monad Testnet
// NOTE: Replace this with the actual deployed factory address when available
export const NFT_FACTORY_ADDRESS = "0x0000000000000000000000000000000000000000";

// Standard NFT Factory ABI - compatible with common factory implementations
export const NFT_FACTORY_ABI = [
  // Create a new NFT collection
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
  // Event emitted when a collection is created
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
  // View function to get collections by creator
  {
    inputs: [{ name: "creator", type: "address" }],
    name: "getCollectionsByCreator",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  // View function to check if factory is active
  {
    inputs: [],
    name: "isActive",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
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
