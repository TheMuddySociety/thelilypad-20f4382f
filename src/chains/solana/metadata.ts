import { Umi, createGenericFileFromBrowserFile } from '@metaplex-foundation/umi';

/**
 * Solana Metadata - Arweave/Irys uploads with retry and deterministic resolution
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            const isLast = attempt === MAX_RETRIES - 1;
            if (isLast) throw err;
            const delay = BASE_DELAY_MS * Math.pow(2, attempt);
            console.warn(`[Irys] ${label} attempt ${attempt + 1} failed, retrying in ${delay}ms...`, err.message);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error('Unreachable');
}

/**
 * Upload a single file to Arweave via Irys (using createGenericFileFromBrowserFile)
 */
export async function uploadFile(umi: Umi, file: File): Promise<string> {
    const genericFile = await createGenericFileFromBrowserFile(file);
    const [uri] = await withRetry(() => umi.uploader.upload([genericFile]), `upload(${file.name})`);
    return uri;
}

/**
 * Upload multiple files to Arweave in batches with retry
 */
export async function uploadFiles(umi: Umi, files: File[]): Promise<string[]> {
    const genericFiles = await Promise.all(
        files.map(file => createGenericFileFromBrowserFile(file))
    );

    const batchSize = 10;
    const uris: string[] = [];

    for (let i = 0; i < genericFiles.length; i += batchSize) {
        const batch = genericFiles.slice(i, i + batchSize);
        const batchUris = await withRetry(
            () => umi.uploader.upload(batch),
            `uploadBatch(${i}..${i + batch.length})`
        );
        uris.push(...batchUris);
    }

    return uris;
}

/**
 * Upload JSON metadata to Arweave
 */
export async function uploadMetadata(umi: Umi, metadata: any): Promise<string> {
    return withRetry(() => umi.uploader.uploadJson(metadata), 'uploadJson');
}

/**
 * Upload multiple JSON metadata objects in batches
 */
export async function uploadJsonBatch(umi: Umi, metadataArray: any[]): Promise<string[]> {
    const genericFiles = metadataArray.map((metadata, index) => ({
        buffer: new Uint8Array(Buffer.from(JSON.stringify(metadata), 'utf-8')),
        fileName: `${index}.json`,
        displayName: `Metadata ${index}`,
        uniqueName: `${Date.now()}-${index}.json`,
        contentType: 'application/json',
        extension: 'json',
        tags: [],
    }));

    const batchSize = 10;
    const uris: string[] = [];

    for (let i = 0; i < genericFiles.length; i += batchSize) {
        const batch = genericFiles.slice(i, i + batchSize);
        const batchUris = await withRetry(
            () => umi.uploader.upload(batch),
            `uploadJsonBatch(${i}..${i + batch.length})`
        );
        uris.push(...batchUris);
    }

    return uris;
}

/**
 * Resolve metadata URI — requires an Arweave CID
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
