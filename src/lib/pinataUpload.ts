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

/** 
 * Slugifies a string to be safe for Pinata folder names and metadata.
 */
function slugifyName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
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
/**
 * Upload a ZIP file to Pinata IPFS.
 * This is the most resilient way to upload folders on Windows.
 *
 * @param zipBlob The ZIP file as a Blob
 * @param fileName Name for the pinned file/folder
 * @param groupId Optional group ID
 */
export async function uploadZipToPinata(
    zipBlob: Blob,
    fileName: string,
    groupId?: string
): Promise<PinataPinResponse> {
    const jwt = getPinataJWT();
    const formData = new FormData();

    // In Pinata's classic API, we send a zip and they unpack it
    // if we provide the right metadata
    const safeName = slugifyName(fileName);
    formData.append('file', zipBlob, `${safeName}.zip`);

    // pinataMetadata should be a JSON string
    formData.append('pinataMetadata', JSON.stringify({
        name: safeName,
        keyvalues: {
            source: 'lilypad-launchpad',
            type: 'collection-assets'
        }
    }));

    // pinataOptions can include expandZip: true to have Pinata unpack it
    formData.append('pinataOptions', JSON.stringify({
        cidVersion: 1, // Use V1 CIDs for better compatibility
        expandZip: true // This tells Pinata to unpack the ZIP and return the directory CID
    }));

    // We can also include expandZip: true if using specific endpoints,
    // but pinning a zip file as a single entry is safer for root CID stability.
    // Pinata UI and typical gateways handle .zip well, or we can use the 
    // directory pinning strategy if we need it unpacked.

    const res = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Pinata ZIP upload failed (${res.status}): ${errorBody}`);
    }

    const result = await res.json();

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
            console.warn('Failed to add ZIP to Pinata group:', err);
        }
    }

    return result;
}

export async function uploadFolderToPinata(
    files: { path: string; content: Blob }[],
    folderName?: string,
    groupId?: string
): Promise<PinataPinResponse> {
    const jwt = getPinataJWT();
    const formData = new FormData();
    const safeFolderName = slugifyName(folderName || 'assets');

    // For directory pinning, the order and names are CRITICAL.
    // metadata FIRST
    formData.append('pinataMetadata', JSON.stringify({
        name: safeFolderName
    }));

    // options (recommended to use CID v1 for folders)
    formData.append('pinataOptions', JSON.stringify({
        cidVersion: 1
    }));

    for (const file of files) {
        // Important: Ensure no leading slashes in path
        const cleanPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;

        // Pinata requires the root folder name to be included in the 'filename' parameter of the multipart field
        const fullPath = `${safeFolderName}/${cleanPath}`;

        // Use a clean Blob instance
        const blob = new Blob([file.content], { type: file.content.type });

        formData.append('file', blob, fullPath);
    }

    const res = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${jwt}`
            // DO NOT set Content-Type header, let fetch set it with the boundary
        },
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
