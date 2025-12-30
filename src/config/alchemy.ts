import { defineChain } from "viem";

// Network type
export type NetworkType = "mainnet" | "testnet";

// RPC URLs
export const MONAD_TESTNET_RPC = "https://rpc.ankr.com/monad_testnet";
export const MONAD_MAINNET_RPC = "https://rpc.ankr.com/monad"; // Placeholder for mainnet

// Monad Mainnet chain configuration (placeholder - update when mainnet launches)
// Using a distinct chain ID that won't conflict with Ethereum mainnet
export const monadMainnet = defineChain({
  id: 41454, // Monad Mainnet chain ID (placeholder - update when official ID is announced)
  name: "Monad Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: [MONAD_MAINNET_RPC],
    },
    public: {
      http: [MONAD_MAINNET_RPC],
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
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: [MONAD_TESTNET_RPC],
    },
    public: {
      http: [MONAD_TESTNET_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
});

// Get chain config based on network type
export const getMonadChain = (network: NetworkType) => 
  network === "mainnet" ? monadMainnet : monadTestnet;

// Get RPC URL based on network type
export const getRpcUrl = (network: NetworkType = "testnet") => 
  network === "mainnet" ? MONAD_MAINNET_RPC : MONAD_TESTNET_RPC;
