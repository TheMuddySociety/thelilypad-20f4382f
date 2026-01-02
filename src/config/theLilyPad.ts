// TheLilyPad Contract Configuration for Monad Testnet
// Re-exports from nftFactory.ts for consistency

export { 
  NFT_FACTORY_ADDRESS as THELILYPAD_CONTRACT_ADDRESS,
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
} from './nftFactory';
