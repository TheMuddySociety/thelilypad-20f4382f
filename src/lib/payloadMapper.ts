import { SupportedChain } from "@/config/chains";

/**
 * PayloadMapper - Deterministic Metadata Resolution
 *
 * Generates root URIs and item paths for the dedicated NFT Storage
 * Supabase project (jlkupdukwgsadvzxafed).
 *
 * All creators use Supabase Cloud as primary hosting.
 * IPFS (via Cloudflare gateway) is admin-only and is NOT part of the launchpad flow.
 */

// Points to the NFT Storage Supabase project (not the main app project)
const NFT_STORAGE_URL = import.meta.env.VITE_STORAGE_SUPABASE_URL || '';
const NFT_STORAGE_HOST = NFT_STORAGE_URL.replace('https://', '').split('.')[0] || 'jlkupdukwgsadvzxafed';

export interface CollectionStorageInfo {
    /** Root URL of the metadata folder */
    rootUri: string;
    /** Full public URL to a specific token's JSON metadata */
    itemMetadataUri: (tokenId: string | number) => string;
    /** Full public URL to a specific token's image */
    itemImageUri: (tokenId: string | number, extension?: string) => string;
}

/**
 * Get storage info for a collection.
 * Uses the dedicated NFT Storage Supabase project buckets.
 *
 * @param collectionId  Supabase collection ID
 */
export function getCollectionStorageInfo(collectionId: string): CollectionStorageInfo {
    const imageBase = `https://${NFT_STORAGE_HOST}.supabase.co/storage/v1/object/public/nft-images/collections/${collectionId}`;
    const metadataBase = `https://${NFT_STORAGE_HOST}.supabase.co/storage/v1/object/public/nft-metadata/collections/${collectionId}`;

    return {
        rootUri: `${metadataBase}/`,
        itemMetadataUri: (tokenId) => `${metadataBase}/${tokenId}.json`,
        itemImageUri: (tokenId, extension = 'png') => `${imageBase}/${tokenId}.${extension}`,
    };
}

/**
 * Chain-specific Payload configuration
 */
export const CHAIN_PAYLOAD_CONFIG = {
    solana: {
        strategy: 'prefixUri',
        requiresIndividualUpload: false,
    },
    xrpl: {
        // Supabase cloud hosting — no IPFS required for creators
        strategy: 'supabaseCloud',
        requiresIndividualUpload: false,
    },
    monad: {
        strategy: 'baseUri',
        requiresIndividualUpload: false,
    }
};

/**
 * Get the Root URI string for a specific chain's metadata resolution.
 * All chains now resolve to Supabase Cloud.
 */
export function getChainRootUri(chain: SupportedChain, collectionId: string): string {
    const info = getCollectionStorageInfo(collectionId);
    // All chains use Supabase metadata root — IPFS is admin-only via Cloudflare gateway outside this flow
    return info.rootUri;
}
