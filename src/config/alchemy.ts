import { defineChain } from "viem";

// PLACEHOLDER: Replace with your regenerated Alchemy API key
export const ALCHEMY_API_KEY = "YOUR_ALCHEMY_API_KEY_HERE";

// Network type
export type NetworkType = "mainnet" | "testnet";

// Monad Mainnet chain configuration
export const monadMainnet = defineChain({
  id: 10143,
  name: "Monad Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: [`https://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
    public: {
      http: [`https://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://explorer.monad.xyz",
    },
  },
});

// Monad Testnet chain configuration
export const monadTestnet = defineChain({
  id: 10144,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: [`https://monad-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
    public: {
      http: [`https://monad-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://testnet.explorer.monad.xyz",
    },
  },
});

// Get chain config based on network type
export const getMonadChain = (network: NetworkType) => 
  network === "mainnet" ? monadMainnet : monadTestnet;

// Alchemy RPC endpoint
export const getAlchemyRpcUrl = (network: NetworkType = "mainnet") => 
  network === "mainnet"
    ? `https://monad-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    : `https://monad-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
