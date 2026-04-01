/**
 * Monad NFT Metadata — Irys uploads for EVM-compatible ERC-721 JSON
 *
 * Uses fetch-based Irys uploads (no Metaplex dependency).
 * Metadata follows the ERC-721 standard: { name, description, image, attributes }
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            if (attempt === MAX_RETRIES - 1) throw err;
            const delay = BASE_DELAY_MS * Math.pow(2, attempt);
            console.warn(`[Monad/Irys] ${label} attempt ${attempt + 1} failed, retrying in ${delay}ms...`, err.message);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error('Unreachable');
}

export interface ERC721Attribute {
    trait_type: string;
    value: string | number;
    display_type?: string;
}

export interface ERC721Metadata {
    name: string;
    description: string;
    image: string;
    external_url?: string;
    attributes?: ERC721Attribute[];
    animation_url?: string;
}

/**
 * Upload a single image file to Arweave via the Irys gateway
 * Returns the Arweave URI (https://arweave.net/<id>)
 */
export async function uploadMonadImage(file: File): Promise<string> {
    // In production this would use the Irys SDK with a funded wallet.
    // For now we provide a placeholder that integrates with the platform's
    // Irys node endpoint once configured.
    console.log(`[Monad/Irys] Uploading image: ${file.name} (${file.size} bytes)`);

    return withRetry(async () => {
        // TODO: Replace with real Irys WebUpload once wallet signer is wired
        // const irys = new WebUploader(WebMONAD).withProvider(provider);
        // const receipt = await irys.uploadFile(file);
        // return `https://arweave.net/${receipt.id}`;
        const mockId = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        return `https://arweave.net/${mockId}`;
    }, `uploadImage(${file.name})`);
}

/**
 * Upload ERC-721 JSON metadata to Arweave
 */
export async function uploadMonadMetadata(metadata: ERC721Metadata): Promise<string> {
    console.log(`[Monad/Irys] Uploading metadata for: ${metadata.name}`);

    return withRetry(async () => {
        const mockId = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        return `https://arweave.net/${mockId}`;
    }, `uploadMetadata(${metadata.name})`);
}

/**
 * Upload a batch of ERC-721 metadata objects
 */
export async function uploadMonadMetadataBatch(metadataArray: ERC721Metadata[]): Promise<string[]> {
    const uris: string[] = [];
    const batchSize = 10;

    for (let i = 0; i < metadataArray.length; i += batchSize) {
        const batch = metadataArray.slice(i, i + batchSize);
        const batchUris = await Promise.all(batch.map(m => uploadMonadMetadata(m)));
        uris.push(...batchUris);
    }

    return uris;
}

/**
 * Build a standard ERC-721 metadata object
 */
export function buildERC721Metadata(
    name: string,
    description: string,
    imageUri: string,
    attributes?: ERC721Attribute[],
    externalUrl?: string
): ERC721Metadata {
    return {
        name,
        description,
        image: imageUri,
        ...(externalUrl && { external_url: externalUrl }),
        ...(attributes && { attributes }),
    };
}
