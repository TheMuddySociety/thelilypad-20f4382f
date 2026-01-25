// The Lily Pad main contract configuration
// NOTE: Solana-only migration - EVM factory removed

import {
  LILYPAD_PLATFORM_NAME,
  LILYPAD_PLATFORM_VERSION,
  PLATFORM_FEE_BPS,
  BUYBACK_SPLIT_BPS,
  NFT_FACTORY_ADDRESS,
  isFactoryConfigured,
} from "./nftFactory";

// Deployed "The Lily Pad" ERC721 contract (Monad Testnet) - Legacy
export const THELILYPAD_CONTRACT_ADDRESS =
  "0xE9fbe48cc99E3ee6b41DE2BF830df02D1e14b651";

// Legacy types for backwards compatibility
export interface TheLilyPadPhase {
  name: string;
  price: number;
  startTime: number;
  endTime: number;
  maxPerWallet: number;
  merkleRoot?: string;
}

export interface TheLilyPadPlatformInfo {
  name: string;
  version: string;
}

export interface TheLilyPadFeeInfo {
  platformFeeBps: number;
  buybackSplitBps: number;
}

// Re-exports
export {
  LILYPAD_PLATFORM_NAME,
  LILYPAD_PLATFORM_VERSION,
  PLATFORM_FEE_BPS,
  BUYBACK_SPLIT_BPS,
  NFT_FACTORY_ADDRESS,
  isFactoryConfigured,
};

// Legacy stub exports
export const NFT_COLLECTION_IMPLEMENTATION = "";
export const THELILYPAD_LAUNCHPAD_ADDRESS = "";
export const PLATFORM_TREASURY = "";
export const BUYBACK_POOL = "";
export const THELILYPAD_FACTORY_ABI: any[] = [];
export const THELILYPAD_ABI: any[] = [];
export const isTheLilyPadConfigured = () => false;

