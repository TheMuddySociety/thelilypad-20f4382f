import { SupportedChain } from "@/config/chains";

/**
 * PayloadMapper - Deterministic Metadata Resolution
 * 
 * Generates root URIs and item paths for high-performance, 
 * cost-efficient NFT storage on Supabase Cloud.
 */

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'your-project';
const STORAGE_BUCKET = 'nfts';

export interface CollectionStorageInfo {
    rootUri: string;
    itemMetadataUri: (tokenId: string | number) => string;
    itemImageUri: (tokenId: string | number, extension?: string) => string;
}

/**
 * Get storage info for a collection
 * @param collectionId Supabase collection ID
 */
export function getCollectionStorageInfo(collectionId: string): CollectionStorageInfo {
    const baseUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/${collectionId}`;

    return {
        rootUri: `${baseUrl}/`,
        itemMetadataUri: (tokenId) => `${baseUrl}/${tokenId}.json`,
        itemImageUri: (tokenId, extension = 'png') => `${baseUrl}/${tokenId}.${extension}`,
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
        strategy: 'domainField',
        requiresIndividualUpload: false,
    },
    monad: {
        strategy: 'baseUri',
        requiresIndividualUpload: false,
    }
};

/**
 * Get the Root URI string for a specific chain's metadata resolution
 */
export function getChainRootUri(chain: SupportedChain, collectionId: string): string {
    const info = getCollectionStorageInfo(collectionId);

    switch (chain) {
        case 'xrpl':
            // For XRPL, we return the domain field root
            // Note: XRPL Domain field is often encoded or uses a standard web root
            return info.rootUri;
        case 'solana':
            // For Metaplex Core Candy Machine prefixUri
            return info.rootUri;
        case 'monad':
            // For ERC-721 baseURI
            return info.rootUri;
        default:
            return info.rootUri;
    }
}
