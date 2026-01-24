// LilyPad Platform Utility Configuration - Solana Migration
// Formerly contained Monad Testnet Factory info

// LilyPad platform constants
export const LILYPAD_PLATFORM_NAME = "The Lily Pad";
export const LILYPAD_PLATFORM_VERSION = "1.0.0";

// Helper function to validate IPFS CIDs
export function isValidIPFSCID(cid: string): boolean {
  if (!cid) return false;
  return (cid.startsWith('Qm') && cid.length === 46) ||
    (cid.startsWith('bafy') && cid.length >= 52);
}

// Helper to construct token URI from IPFS base CID
export function constructTokenURI(ipfsBaseCID: string, tokenId: number): string {
  return `ipfs://${ipfsBaseCID}/${tokenId}.json`;
}

// Platform fee configuration
export const PLATFORM_FEE_BPS = 250; // 2.5% total platform fee
export const BUYBACK_SPLIT_BPS = 5000; // 50% of platform fee goes to buyback

// Note: EVM Factory ABI and addresses removed for Solana-only migration
export const NFT_FACTORY_ADDRESS = "";
export function isFactoryConfigured(): boolean { return false; }
