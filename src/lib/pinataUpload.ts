/**
 * Pinata IPFS Upload Service
 *
 * Lightweight wrapper around Pinata's REST API for uploading
 * NFT images and metadata to IPFS. No SDK dependency — uses fetch().
 *
 * Requires VITE_PINATA_JWT environment variable.
 */

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

function getPinataJWT(): string {
    const jwt = import.meta.env.VITE_PINATA_JWT;
    if (!jwt) {
        throw new Error(
            'Pinata JWT not configured. Add VITE_PINATA_JWT to your .env file. ' +
            'Get one free at https://pinata.cloud'
        );
    }
    return jwt;
}

/** Result returned by Pinata after a successful pin */
export interface PinataPinResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
}

/**
 * Upload a single file to Pinata IPFS.
 */
export async function uploadFileToPinata(
    file: File | Blob,
    name?: string
): Promise<PinataPinResponse> {
    const jwt = getPinataJWT();
    const formData = new FormData();
    formData.append('file', file);

    if (name) {
        formData.append('pinataMetadata', JSON.stringify({ name }));
    }

    const res = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Pinata upload failed (${res.status}): ${errorBody}`);
    }

    return res.json();
}

/**
 * Upload a JSON object to Pinata IPFS.
 */
export async function uploadJsonToPinata(
    json: object,
    name?: string
): Promise<PinataPinResponse> {
    const jwt = getPinataJWT();

    const body: Record<string, unknown> = { pinataContent: json };
    if (name) {
        body.pinataMetadata = { name };
    }

    const res = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Pinata JSON upload failed (${res.status}): ${errorBody}`);
    }

    return res.json();
}

/**
 * Upload a folder of files to Pinata IPFS.
 *
 * All files are pinned under a single directory CID.
 * Access individual files via: ipfs://{CID}/{filename}
 *
 * @param files Array of { path, content } where path is the relative filename
 * @param folderName Optional name for the pinned folder
 */
export async function uploadFolderToPinata(
    files: { path: string; content: Blob }[],
    folderName?: string
): Promise<PinataPinResponse> {
    const jwt = getPinataJWT();
    const formData = new FormData();

    for (const file of files) {
        // Pinata expects the path prefix to group files into a folder
        formData.append('file', file.content, file.path);
    }

    const metadata: Record<string, unknown> = {};
    if (folderName) metadata.name = folderName;
    formData.append('pinataMetadata', JSON.stringify(metadata));

    // Tell Pinata to wrap files in a directory
    formData.append('pinataOptions', JSON.stringify({ wrapWithDirectory: true }));

    const res = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Pinata folder upload failed (${res.status}): ${errorBody}`);
    }

    return res.json();
}

/**
 * Build a public IPFS gateway URL from a CID.
 */
export function getIpfsGatewayUrl(cid: string, path?: string): string {
    const base = `${PINATA_GATEWAY}/${cid}`;
    return path ? `${base}/${path}` : base;
}

/**
 * Build an ipfs:// protocol URI.
 */
export function getIpfsUri(cid: string, path?: string): string {
    const base = `ipfs://${cid}`;
    return path ? `${base}/${path}` : base;
}

/**
 * Check if Pinata is configured (JWT present).
 */
export function isPinataConfigured(): boolean {
    return !!import.meta.env.VITE_PINATA_JWT;
}

/**
 * Convert a base64 data URL to a Blob.
 * Useful for uploading canvas-generated images.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
}
