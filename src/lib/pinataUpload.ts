/**
 * Pinata IPFS Upload Service
 *
 * Lightweight wrapper around Pinata's REST API for uploading
 * NFT images and metadata to IPFS. No SDK dependency — uses fetch().
 *
 * Requires VITE_PINATA_JWT environment variable.
 */

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_UPLOADS_URL = 'https://uploads.pinata.cloud/v3';
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
    id?: string; // v3 file ID
}

/** Result returned by Pinata after creating a group */
export interface PinataGroupResponse {
    id: string;
    name: string;
    created_at: string;
}

/**
 * Create a Pinata Group to organize collection assets.
 */
export async function createPinataGroup(name: string): Promise<PinataGroupResponse> {
    const jwt = getPinataJWT();

    const res = await fetch(`${PINATA_API_URL}/v3/groups`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ name }),
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Failed to create Pinata group (${res.status}): ${errorBody}`);
    }

    const { data } = await res.json();
    return data;
}

/**
 * Upload a single file to Pinata IPFS.
 */
export async function uploadFileToPinata(
    file: File | Blob,
    name?: string,
    groupId?: string
): Promise<PinataPinResponse> {
    const jwt = getPinataJWT();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('network', 'public');

    if (name) {
        formData.append('name', name);
    }

    if (groupId) {
        formData.append('group', groupId);
    }

    const res = await fetch(`${PINATA_UPLOADS_URL}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Pinata upload failed (${res.status}): ${errorBody}`);
    }

    const { data } = await res.json();
    // Map v3 response to our shared interface if possible
    return {
        IpfsHash: data.cid,
        PinSize: data.size,
        Timestamp: data.created_at,
        id: data.id
    };
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
 * @param groupId Optional group ID to add assets to
 */
export async function uploadFolderToPinata(
    files: { path: string; content: Blob }[],
    folderName?: string,
    groupId?: string
): Promise<PinataPinResponse> {
    const jwt = getPinataJWT();
    const formData = new FormData();

    for (const file of files) {
        // Folder upload via fetch requires the path in the filename param
        formData.append('file', file.content, `${folderName || 'assets'}/${file.path}`);
    }

    if (folderName) {
        formData.append('pinataMetadata', JSON.stringify({ name: folderName }));
    }

    if (groupId) {
        // v3 API supports grouping during upload for some endpoints, 
        // but for classic folder pinning we might need to add to group after.
        // However, pinFileToIPFS still works for recursive folders best.
        formData.append('pinataOptions', JSON.stringify({
            wrapWithDirectory: true,
            groupId: groupId // Some internal Pinata versions use this
        }));
    }

    const res = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Pinata folder upload failed (${res.status}): ${errorBody}`);
    }

    const result = await res.json();

    // If we have a groupId, we should also associate the directory CID with the group via v3 API
    if (groupId && result.IpfsHash) {
        try {
            await fetch(`${PINATA_API_URL}/v3/groups/${groupId}/files`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ files: [result.IpfsHash] }),
            });
        } catch (err) {
            console.warn('Failed to add folder to Pinata group, but upload succeeded:', err);
        }
    }

    return result;
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
