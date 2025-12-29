// ERC721 with Phases Contract - Compiled bytecode and ABI
// This contract supports: allowlist phases, public mint, price per phase, max per wallet

export const NFT_CONTRACT_ABI = [
  // Constructor
  {
    inputs: [
      { name: "name_", type: "string" },
      { name: "symbol_", type: "string" },
      { name: "maxSupply_", type: "uint256" },
      { name: "royaltyBps_", type: "uint256" },
      { name: "royaltyReceiver_", type: "address" }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
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
      { indexed: true, name: "phaseId", type: "uint256" },
      { indexed: false, name: "price", type: "uint256" },
      { indexed: false, name: "maxPerWallet", type: "uint256" },
      { indexed: false, name: "supply", type: "uint256" }
    ],
    name: "PhaseConfigured",
    type: "event"
  },
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
    name: "activePhase",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "phaseId", type: "uint256" }],
    name: "getPhase",
    outputs: [
      { name: "price", type: "uint256" },
      { name: "maxPerWallet", type: "uint256" },
      { name: "supply", type: "uint256" },
      { name: "minted", type: "uint256" },
      { name: "requiresAllowlist", type: "bool" },
      { name: "isActive", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // State-changing functions
  {
    inputs: [
      { name: "phaseId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "maxPerWallet", type: "uint256" },
      { name: "supply", type: "uint256" },
      { name: "requiresAllowlist", type: "bool" }
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
      { name: "addresses", type: "address[]" },
      { name: "phaseId", type: "uint256" }
    ],
    name: "setAllowlist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
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
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "baseURI_", type: "string" }],
    name: "setBaseURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Transfer functions (ERC721 standard)
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
  // Approval functions (ERC721 standard)
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
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "getApproved",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
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
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" }
    ],
    name: "isApprovedForAll",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// NOTE: Contract deployment requires a properly compiled Solidity contract.
// The bytecode below is a placeholder. For production use, you need to:
// 1. Compile your actual Solidity contract using solc, Hardhat, or Foundry
// 2. Replace this bytecode with the compiled output
// 
// For testing on Monad testnet, we recommend using a pre-deployed factory contract
// or deploying via Remix/Hardhat with a verified contract.
//
// This minimal bytecode creates a simple contract that stores the deployer as owner.
// It will NOT function as a full ERC721 - it's only for testing the deployment flow.
export const NFT_CONTRACT_BYTECODE = "0x608060405234801561001057600080fd5b506040516105d83803806105d8833981810160405281019061003291906101e0565b336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550846001908161008191906104a0565b50836002908161009191906104a0565b5082600381905550816004819055508060058190555050505050506105a6565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b610118826100cf565b810181811067ffffffffffffffff82111715610137576101366100e0565b5b80604052505050565b600061014a6100b1565b9050610156828261010f565b919050565b600067ffffffffffffffff821115610176576101756100e0565b5b61017f826100cf565b9050602081019050919050565b60005b838110156101aa57808201518184015260208101905061018f565b60008484015250505050565b60006101c96101c48461015b565b610140565b9050828152602081018484840111156101e5576101e46100ca565b5b6101f084828561018c565b509392505050565b600082601f83011261020d5761020c6100c5565b5b815161021d8482602086016101b6565b91505092915050565b6000819050919050565b61023981610226565b811461024457600080fd5b50565b60008151905061025681610230565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006102878261025c565b9050919050565b6102978161027c565b81146102a257600080fd5b50565b6000815190506102b48161028e565b92915050565b600080600080600060a086880312156102d6576102d56100bb565b5b600086015167ffffffffffffffff8111156102f4576102f36100c0565b5b610300888289016101f8565b955050602086015167ffffffffffffffff811115610321576103206100c0565b5b61032d888289016101f8565b945050604061033e88828901610247565b935050606061034f88828901610247565b9250506080610360888289016102a5565b9150509295509295909350565b600081519050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806103bf57607f821691505b6020821081036103d2576103d1610378565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b60006008830261043a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff826103fd565b61044486836103fd565b95508019841693508086168417925050509392505050565b6000819050919050565b600061048161047c61047784610226565b61045c565b610226565b9050919050565b6000819050919050565b61049b83610466565b6104af6104a782610488565b84845461040a565b825550505050565b600090565b6104c46104b7565b6104cf818484610492565b505050565b5b818110156104f3576104e86000826104bc565b6001810190506104d5565b5050565b601f82111561053857610509816103d8565b610512846103ed565b81016020851015610521578190505b61053561052d856103ed565b8301826104d4565b50505b505050565b600082821c905092915050565b600061055b6000198460080261053d565b1980831691505092915050565b6000610574838361054a565b9150826002028217905092915050565b61058d8261036d565b67ffffffffffffffff8111156105a6576105a56100e0565b5b6105b082546103a7565b6105bb8282856104f7565b600060209050601f8311600181146105ee57600084156105dc578287015190505b6105e68582610568565b86555061064e565b601f1984166105fc866103d8565b60005b82811015610624578489015182556001820191506020850194506020810190506105ff565b86831015610641578489015161063d601f89168261054a565b8355505b6001600288020188555050505b505050505050565b6024806105646000396000f3fe608060405260043610601a575b6000801061012c5773ffffffffffffffffffffffffffffffffffffffff";

// Contract deployment parameters interface
export interface DeployParams {
  name: string;
  symbol: string;
  maxSupply: number;
  royaltyBps: number; // Basis points (e.g., 500 = 5%)
  royaltyReceiver: string;
}

// Phase configuration for the contract
export interface PhaseConfig {
  phaseId: number;
  price: bigint; // In wei
  maxPerWallet: number;
  supply: number;
  requiresAllowlist: boolean;
}

// Encode constructor arguments for deployment
export function encodeConstructorArgs(params: DeployParams): string {
  // In a production environment, you would use ethers.js or viem to properly encode these
  // For now, we'll use the raw bytecode which already has placeholder values
  return NFT_CONTRACT_BYTECODE;
}

// Calculate royalty in basis points
export function toRoyaltyBps(percent: number): number {
  return Math.round(percent * 100);
}
