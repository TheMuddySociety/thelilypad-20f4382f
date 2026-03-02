/**
 * NFT.Storage Integration Client
 * Provides IPFS-based storage for NFT assets and metadata using the provided API key.
 */

const NFT_STORAGE_KEY = '41ed9f93.8ebf116dc7044b5396b8d950c16caa9e';
const NFT_STORAGE_ENDPOINT = 'https://api.nft.storage';

/**
 * Upload a single file to NFT.Storage (IPFS)
 */
export async function uploadToIPFS(file: File | Blob, fileName?: string): Promise<string> {
    try {
        const body = file;
        const headers = {
            'Authorization': `Bearer ${NFT_STORAGE_KEY}`,
            'Content-Type': file.type || 'application/octet-stream',
        };

        const response = await fetch(`${NFT_STORAGE_ENDPOINT}/upload`, {
            method: 'POST',
            body,
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'NFT.Storage upload failed');
        }

        const data = await response.json();
        const cid = data.value.cid;

        // Return IPFS gateway URL (using the official CID)
        return `ipfs://${cid}`;
    } catch (err: any) {
        console.error('[nft-storage] Upload failed:', err);
        throw err;
    }
}

/**
 * Store JSON metadata as a Car or JSON blob on NFT.Storage
 */
export async function storeMetadataToIPFS(metadata: any): Promise<string> {
    try {
        const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
        return uploadToIPFS(blob, 'metadata.json');
    } catch (err: any) {
        console.error('[nft-storage] Metadata store failed:', err);
        throw err;
    }
}

/**
 * Upload a batch of files as a directory to NFT.Storage
 * @returns The root CID (ipfs://CID/) for the directory
 */
export async function batchUploadToIPFS(files: { name: string, file: File | Blob }[]): Promise<string> {
    try {
        // nft.storage /upload endpoint doesn't natively support multi-file directory in simple POST
        // We use the NFT.Storage JS client logic: group files into a single request
        // Since we are using fetch, we'll use FormData which nft.storage supports
        const formData = new FormData();
        files.forEach(f => {
            formData.append('file', f.file, f.name);
        });

        const response = await fetch(`${NFT_STORAGE_ENDPOINT}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${NFT_STORAGE_KEY}`,
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Batch upload failed');
        }

        const data = await response.json();
        const cid = data.value.cid;

        return `ipfs://${cid}`;
    } catch (err: any) {
        console.error('[nft-storage] Batch upload failed:', err);
        throw err;
    }
}

/**
 * Resolve IPFS URI to a public gateway URL
 */
export function resolveIPFS(uri: string): string {
    if (!uri) return '';
    if (uri.startsWith('ipfs://')) {
        return uri.replace('ipfs://', 'https://nftstorage.link/ipfs/');
    }
    return uri;
}
