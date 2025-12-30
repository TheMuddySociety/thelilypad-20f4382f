import { defineChain } from "viem";

// Network type
export type NetworkType = "mainnet" | "testnet";

// RPC URLs with fallbacks
export const MONAD_TESTNET_RPCS = [
  "https://rpc.ankr.com/monad_testnet",
  "https://testnet-rpc.monad.xyz",
];

export const MONAD_MAINNET_RPCS = [
  "https://rpc.monad.xyz",        // QuickNode - 25 rps
  "https://rpc1.monad.xyz",       // Alchemy - 15 rps
  "https://rpc3.monad.xyz",       // Ankr - 300 per 10s
];

// Primary RPC URLs (for backwards compatibility)
export const MONAD_TESTNET_RPC = MONAD_TESTNET_RPCS[0];
export const MONAD_MAINNET_RPC = MONAD_MAINNET_RPCS[0];

// Monad Mainnet chain configuration
export const monadMainnet = defineChain({
  id: 143, // Official Monad Mainnet chain ID
  name: "Monad Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: MONAD_MAINNET_RPCS,
    },
    public: {
      http: MONAD_MAINNET_RPCS,
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://monadvision.com",
    },
  },
});

// Monad Testnet chain configuration
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: MONAD_TESTNET_RPCS,
    },
    public: {
      http: MONAD_TESTNET_RPCS,
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision Testnet",
      url: "https://testnet.monadvision.com",
    },
  },
});

// Get chain config based on network type
export const getMonadChain = (network: NetworkType) => 
  network === "mainnet" ? monadMainnet : monadTestnet;

// Get RPC URL based on network type
export const getRpcUrl = (network: NetworkType = "testnet") => 
  network === "mainnet" ? MONAD_MAINNET_RPC : MONAD_TESTNET_RPC;

// Get all RPC URLs for fallback
export const getRpcUrls = (network: NetworkType = "testnet") => 
  network === "mainnet" ? MONAD_MAINNET_RPCS : MONAD_TESTNET_RPCS;
