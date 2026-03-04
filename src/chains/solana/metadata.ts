import { Umi } from '@metaplex-foundation/umi';

/**
 * Solana Metadata - Arweave/Irys uploads and deterministic resolution
 */

/**
 * Upload a single file to Arweave via Irys
 */
export async function uploadFile(umi: Umi, file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const genericFile = {
        buffer: new Uint8Array(buffer),
        fileName: file.name,
        displayName: file.name,
        uniqueName: `${Date.now()}-${file.name}`,
        contentType: file.type,
        extension: file.name.split('.').pop() || '',
        tags: [],
    };
    const [uri] = await umi.uploader.upload([genericFile]);
    return uri;
}

/**
 * Upload multiple files to Arweave in batches
 */
export async function uploadFiles(umi: Umi, files: File[]): Promise<string[]> {
    const genericFiles = await Promise.all(files.map(async (file) => {
        const buffer = await file.arrayBuffer();
        return {
            buffer: new Uint8Array(buffer),
            fileName: file.name,
            displayName: file.name,
            uniqueName: `${Date.now()}-${file.name}`,
            contentType: file.type,
            extension: file.name.split('.').pop() || '',
            tags: [],
        };
    }));

    const batchSize = 10;
    const uris: string[] = [];

    for (let i = 0; i < genericFiles.length; i += batchSize) {
        const batch = genericFiles.slice(i, i + batchSize);
        const batchUris = await umi.uploader.upload(batch);
        uris.push(...batchUris);
    }

    return uris;
}

/**
 * Upload JSON metadata to Arweave
 */
export async function uploadMetadata(umi: Umi, metadata: any): Promise<string> {
    const uri = await umi.uploader.uploadJson(metadata);
    return uri;
}

/**
 * Upload multiple JSON metadata objects in batches
 */
export async function uploadJsonBatch(umi: Umi, metadataArray: any[]): Promise<string[]> {
    const genericFiles = metadataArray.map((metadata, index) => {
        return {
            buffer: new Uint8Array(Buffer.from(JSON.stringify(metadata), 'utf-8')),
            fileName: `${index}.json`,
            displayName: `Metadata ${index}`,
            uniqueName: `${Date.now()}-${index}.json`,
            contentType: 'application/json',
            extension: 'json',
            tags: [],
        };
    });

    const batchSize = 10;
    const uris: string[] = [];

    for (let i = 0; i < genericFiles.length; i += batchSize) {
        const batch = genericFiles.slice(i, i + batchSize);
        const batchUris = await umi.uploader.upload(batch);
        uris.push(...batchUris);
    }

    return uris;
}

/**
 * Resolve metadata URI — requires an Arweave CID
 * Returns empty string if no CID is provided (assets must be uploaded first)
 */
export function resolveMetadataUri(collectionId: string, tokenId: number | string, arweaveCid?: string): string {
    if (!arweaveCid) return '';
    return `https://arweave.net/${arweaveCid}/${tokenId}.json`;
}

/**
 * Resolve image URI — requires an Arweave CID
 */
export function resolveImageUri(collectionId: string, tokenId: number | string, extension = 'png', arweaveCid?: string): string {
    if (!arweaveCid) return '';
    return `https://arweave.net/${arweaveCid}/${tokenId}.${extension}`;
}
