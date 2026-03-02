import { SupportedChain } from "@/config/chains";

/**
 * PayloadMapper - Professional Metadata Resolution
 *
 * Generates root URIs and item paths for the dedicated NFT Storage
 * Supabase project (jlkupdukwgsadvzxafed).
 *
 * All creators use the Hybrid Launchpad strategy:
 * 1. Supabase Cloud: Primary hosting for speed and immediate previewing.
 * 2. Arweave (via Irys): Permanent on-chain reference and decentralized storage.
 */

// Points to the NFT Storage Supabase project (not the main app project)
const NFT_STORAGE_URL = import.meta.env.VITE_STORAGE_SUPABASE_URL || '';
const NFT_STORAGE_HOST = NFT_STORAGE_URL.replace('https://', '').split('.')[0] || 'jlkupdukwgsadvzxafed';

export interface CollectionStorageInfo {
    /** Root URL of the metadata folder (Supabase) */
    rootUri: string;
    /** Full public URL to a specific token's JSON metadata (Supabase) */
    itemMetadataUri: (tokenId: string | number) => string;
    /** Full public URL to a specific token's image (Supabase) */
    itemImageUri: (tokenId: string | number, extension?: string) => string;

    /** Arweave Root URI (if applicable) */
    arweaveRootUri?: string;
    /** Arweave Metadata URI for a specific token */
    arweaveMetadataUri?: (tokenId: string | number) => string;
    /** Arweave Image URI for a specific token */
    arweaveImageUri?: (tokenId: string | number) => string;
}

/**
 * Get storage info for a collection.
 * Uses the dedicated NFT Storage Supabase project buckets.
 *
 * @param collectionId  Supabase collection ID
 * @param arweaveCid    Optional Arweave root CID (or Manifest ID)
 */
export function getCollectionStorageInfo(collectionId: string, arweaveCid?: string): CollectionStorageInfo {
    const imageBase = `https://${NFT_STORAGE_HOST}.supabase.co/storage/v1/object/public/nft-images/collections/${collectionId}`;
    const metadataBase = `https://${NFT_STORAGE_HOST}.supabase.co/storage/v1/object/public/nft-metadata/collections/${collectionId}`;

    return {
        rootUri: `${metadataBase}/`,
        itemMetadataUri: (tokenId) => `${metadataBase}/${tokenId}.json`,
        itemImageUri: (tokenId, extension = 'png') => `${imageBase}/${tokenId}.${extension}`,

        // Arweave mappings (if Cid provided)
        arweaveRootUri: arweaveCid ? `https://arweave.net/${arweaveCid}/` : undefined,
        arweaveMetadataUri: (tokenId) => arweaveCid ? `https://arweave.net/${arweaveCid}/${tokenId}.json` : '',
        arweaveImageUri: (tokenId) => arweaveCid ? `https://arweave.net/${arweaveCid}/${tokenId}.png` : '',
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
        // Supabase cloud hosting — now Arweave-prepared
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
 * All chains now resolve to Supabase Cloud by default, with Arweave persistence.
 */
export function getChainRootUri(chain: SupportedChain, collectionId: string, arweaveCid?: string): string {
    const info = getCollectionStorageInfo(collectionId, arweaveCid);
    // If Arweave CID is available, we use that for true permanence
    if (arweaveCid) return info.arweaveRootUri!;
    return info.rootUri;
}
