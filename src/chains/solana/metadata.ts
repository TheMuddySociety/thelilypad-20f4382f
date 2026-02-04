import { Umi } from '@metaplex-foundation/umi';
import { getCollectionStorageInfo } from '@/lib/payloadMapper';

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

    // Upload in batches of 10 to avoid payload limits
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

    // Upload in batches
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
 * Resolve deterministic metadata URI using Supabase storage
 */
export function resolveMetadataUri(collectionId: string, tokenId: number | string): string {
    const storageInfo = getCollectionStorageInfo(collectionId);
    return storageInfo.itemMetadataUri(tokenId);
}

/**
 * Resolve deterministic image URI using Supabase storage
 */
export function resolveImageUri(collectionId: string, tokenId: number | string, extension = 'png'): string {
    const storageInfo = getCollectionStorageInfo(collectionId);
    return storageInfo.itemImageUri(tokenId, extension);
}
