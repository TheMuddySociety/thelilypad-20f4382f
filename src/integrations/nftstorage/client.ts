const NFT_STORAGE_KEY = '41ed9f93.8ebf116dc7044b5396b8d950c16caa9e';
const LEGACY_ENDPOINT = 'https://api.nft.storage';
const PRESERVE_ENDPOINT = 'https://preserve.nft.storage/api/v1';

/**
 * NFT.Storage Collection Result
 */
export interface NFTStorageCollection {
    collectionID: string;
    collectionName: string;
    contractAddress?: string;
}

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

        const response = await fetch(`${LEGACY_ENDPOINT}/upload`, {
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
 * Create a new collection on NFT.Storage (Preserve Model)
 */
export async function createCollectionOnIPFS(name: string, contractAddress?: string): Promise<NFTStorageCollection> {
    try {
        const body = {
            collectionName: name,
            contractAddress: contractAddress || ''
        };

        const response = await fetch(`${PRESERVE_ENDPOINT}/collection/create_collection`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NFT_STORAGE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Collection creation failed');
        }

        const data = await response.json();
        return data.value; // { collectionID, collectionName, contractAddress }
    } catch (err: any) {
        console.error('[nft-storage] Collection creation failed:', err);
        throw err;
    }
}

/**
 * Add tokens to a collection (Batch mode)
 * Tokens should be an array of { tokenID, cid }
 */
export async function addTokensToCollection(collectionID: string, tokens: { tokenID: string, cid: string }[]): Promise<boolean> {
    try {
        // Convert tokens to CSV format as required by the Preserve API
        const csvRows = tokens.map(t => `${t.tokenID},${t.cid.replace('ipfs://', '')}`).join('\n');
        const csvBlob = new Blob([csvRows], { type: 'text/csv' });

        const formData = new FormData();
        formData.append('tokens', csvBlob, 'tokens.csv');
        formData.append('collectionID', collectionID);

        const response = await fetch(`${PRESERVE_ENDPOINT}/collection/add_tokens`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NFT_STORAGE_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Adding tokens failed');
        }

        return true;
    } catch (err: any) {
        console.error('[nft-storage] Failed to add tokens:', err);
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
        const formData = new FormData();
        files.forEach(f => {
            formData.append('file', f.file, f.name);
        });

        const response = await fetch(`${LEGACY_ENDPOINT}/upload`, {
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
