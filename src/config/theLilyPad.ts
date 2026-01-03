// The Lily Pad main contract configuration
// NOTE: The factory address (NFT_FACTORY_ADDRESS) is used to deploy per-collection contracts.
// The main collection contract is a separate deployed ERC721 contract.

import {
  NFT_FACTORY_ADDRESS,
  NFT_COLLECTION_IMPLEMENTATION,
  THELILYPAD_LAUNCHPAD_ADDRESS,
  LILYPAD_PLATFORM_NAME,
  LILYPAD_PLATFORM_VERSION,
  PLATFORM_FEE_BPS,
  BUYBACK_SPLIT_BPS,
  PLATFORM_TREASURY,
  BUYBACK_POOL,
  NFT_FACTORY_ABI,
  NFT_COLLECTION_ABI,
  isTheLilyPadConfigured,
  isFactoryConfigured,
  type TheLilyPadPhase,
  type LilyPadPlatformInfo,
  type LilyPadFeeInfo,
} from "./nftFactory";

// Deployed "The Lily Pad" ERC721 contract (Monad Testnet)
// If you deploy a new main contract, update this address.
export const THELILYPAD_CONTRACT_ADDRESS =
  "0xE9fbe48cc99E3ee6b41DE2BF830df02D1e14b651";

export {
  NFT_FACTORY_ADDRESS,
  NFT_COLLECTION_IMPLEMENTATION,
  THELILYPAD_LAUNCHPAD_ADDRESS,
  LILYPAD_PLATFORM_NAME,
  LILYPAD_PLATFORM_VERSION,
  PLATFORM_FEE_BPS,
  BUYBACK_SPLIT_BPS,
  PLATFORM_TREASURY,
  BUYBACK_POOL,
  NFT_FACTORY_ABI as THELILYPAD_FACTORY_ABI,
  NFT_COLLECTION_ABI as THELILYPAD_ABI,
  isTheLilyPadConfigured,
  isFactoryConfigured,
  type TheLilyPadPhase,
  type LilyPadPlatformInfo as TheLilyPadPlatformInfo,
  type LilyPadFeeInfo as TheLilyPadFeeInfo,
};

