// TheLilyPadLaunchpad Contract Configuration for Monad Testnet
// Deployed at: 0xE9fbe48cc99E3ee6b41DE2BF830df02D1e14b651
// This is the primary contract for the platform - use nftFactory.ts for the full config

// Re-export from nftFactory.ts for consistency
export { 
  NFT_FACTORY_ADDRESS as THELILYPAD_CONTRACT_ADDRESS,
  THELILYPAD_LAUNCHPAD_ADDRESS,
  LILYPAD_PLATFORM_NAME,
  LILYPAD_PLATFORM_VERSION,
  PLATFORM_FEE_BPS,
  BUYBACK_SPLIT_BPS,
  PLATFORM_TREASURY,
  BUYBACK_POOL,
  NFT_FACTORY_ABI as THELILYPAD_ABI,
  isTheLilyPadConfigured,
  type TheLilyPadPhase,
  type LilyPadPlatformInfo as TheLilyPadPlatformInfo,
  type LilyPadFeeInfo as TheLilyPadFeeInfo,
} from './nftFactory';
