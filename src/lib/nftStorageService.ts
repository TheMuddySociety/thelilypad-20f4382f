/**
 * NFT Collection Storage Service
 *
 * High-level service for uploading and downloading NFT images + metadata
 * via the dedicated Supabase NFT Storage project.
 *
 * Flow:
 *  1. Creator uploads images + metadata to Supabase (cloud hosting)
 *  2. Supabase returns public URLs → stored in the main DB
 *  3. Creator can download a ZIP of images + metadata to launch elsewhere
 *
 * Buckets used (on the NFT Storage Supabase project):
 *   • nft-images    — composited PNG/WEBP images
 *   • nft-metadata  — ERC-721 / XLS-20 JSON files
 *   • collection-images — cover images
 */

import JSZip from 'jszip';
import { storageClient, NFT_BUCKETS, uploadToNftStorage, getStoragePublicUrl, isNftStorageConfigured } from '@/integrations/supabase/storageClient';
import { dataUrlToBlob } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NftAsset {
    /** Token index (0-based) */
    tokenId: number;
    /** Composited image as a data URL, Blob, or File */
    image: string | Blob | File;
    /** File extension — defaults to 'png' */
    imageExt?: string;
    /** Full metadata object (ERC-721 / XLS-20) */
    metadata: Record<string, unknown>;
}

export interface StorageUploadResult {
    /** Token ID */
    tokenId: number;
    /** Public URL of the uploaded image */
    imageUrl: string;
    /** Public URL of the uploaded metadata JSON */
    metadataUrl: string;
}

export interface CollectionStorageResult {
    /** All per-token results */
    tokens: StorageUploadResult[];
    /** Base URL for images  (e.g. https://…/nft-images/collections/{id}/) */
    imageBaseUrl: string;
    /** Base URL for metadata (e.g. https://…/nft-metadata/collections/{id}/) */
    metadataBaseUrl: string;
    /** Public URL to the cover image (if uploaded) */
    coverUrl?: string;
}

export type UploadProgressCallback = (
    current: number,
    total: number,
    status: string
) => void;

// ─── Core upload service ──────────────────────────────────────────────────────

/**
 * Upload a full NFT collection (images + metadata) to Supabase NFT Storage.
 *
 * @param collectionId  Unique collection ID (used as folder prefix)
 * @param assets        Array of NFT assets to upload
 * @param onProgress    Optional progress callback
 */
export async function uploadCollectionToStorage(
    collectionId: string,
    assets: NftAsset[],
    onProgress?: UploadProgressCallback
): Promise<CollectionStorageResult> {
    if (!isNftStorageConfigured()) {
        throw new Error(
            'NFT Storage is not configured. Add VITE_STORAGE_SUPABASE_URL and ' +
            'VITE_STORAGE_SUPABASE_KEY to your .env file.'
        );
    }

    const tokens: StorageUploadResult[] = [];
    const total = assets.length;

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const { tokenId, image, imageExt = 'png', metadata } = asset;
        const imagePath = `collections/${collectionId}/${tokenId}.${imageExt}`;
        const metaPath = `collections/${collectionId}/${tokenId}.json`;

        onProgress?.(i + 1, total, `Uploading NFT ${i + 1} of ${total}…`);

        // ── Upload image ──────────────────────────────────────────────────────────
        let imageBlob: Blob | File;
        if (typeof image === 'string') {
            // data URL
            imageBlob = dataUrlToBlob(image);
        } else {
            imageBlob = image;
        }

        const imageUrl = await uploadToNftStorage(
            NFT_BUCKETS.IMAGES,
            imagePath,
            imageBlob,
            { contentType: `image/${imageExt}`, upsert: true }
        );

        // ── Upload metadata ───────────────────────────────────────────────────────
        const metaBlob = new Blob([JSON.stringify(metadata, null, 2)], {
            type: 'application/json',
        });

        const metadataUrl = await uploadToNftStorage(
            NFT_BUCKETS.METADATA,
            metaPath,
            metaBlob,
            { contentType: 'application/json', upsert: true }
        );

        tokens.push({ tokenId, imageUrl, metadataUrl });
    }

    // Build base URLs (folder-level public URL)
    const imageBaseUrl = getStoragePublicUrl(NFT_BUCKETS.IMAGES, `collections/${collectionId}/`);
    const metadataBaseUrl = getStoragePublicUrl(NFT_BUCKETS.METADATA, `collections/${collectionId}/`);

    return { tokens, imageBaseUrl, metadataBaseUrl };
}

/**
 * Upload a cover image to the `collection-images` bucket.
 */
export async function uploadCoverToStorage(
    collectionId: string,
    file: File
): Promise<string> {
    if (!isNftStorageConfigured()) {
        throw new Error('NFT Storage is not configured.');
    }

    const ext = file.name.split('.').pop() || 'png';
    const path = `covers/${collectionId}/cover.${ext}`;

    return uploadToNftStorage(NFT_BUCKETS.COVERS, path, file, {
        contentType: file.type || `image/${ext}`,
        upsert: true,
    });
}

// ─── Download service (creators → external launchpad) ────────────────────────

/**
 * Download a creator's collection as a ZIP file ready to upload to any
 * external launchpad (Magic Eden, OpenSea, Tensor, etc.).
 *
 * ZIP structure:
 *   images/
 *     0.png
 *     1.png
 *     …
 *   metadata/
 *     0.json
 *     1.json
 *     …
 *   _collection.json  ← collection manifest
 *   README.txt        ← instructions for external launchpads
 *
 * @param collectionId   Collection ID (used to list files)
 * @param collectionName Human-readable name for zip filename
 * @param tokenCount     Expected number of tokens
 * @param imageExt       Image file extension (default: 'png')
 * @param onProgress     Progress callback
 */
export async function downloadCollectionAsZip(
    collectionId: string,
    collectionName: string,
    tokenCount: number,
    imageExt = 'png',
    onProgress?: UploadProgressCallback
): Promise<Blob> {
    if (!isNftStorageConfigured()) {
        throw new Error('NFT Storage is not configured.');
    }

    const zip = new JSZip();
    const imagesFolder = zip.folder('images')!;
    const metadataFolder = zip.folder('metadata')!;

    const safeImageExt = imageExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';

    for (let i = 0; i < tokenCount; i++) {
        onProgress?.(i + 1, tokenCount, `Packaging NFT ${i + 1} of ${tokenCount}…`);

        // Fetch image
        const imagePath = `collections/${collectionId}/${i}.${safeImageExt}`;
        const imagePublicUrl = getStoragePublicUrl(NFT_BUCKETS.IMAGES, imagePath);

        try {
            const imgRes = await fetch(imagePublicUrl);
            if (imgRes.ok) {
                const imgBuffer = await imgRes.arrayBuffer();
                imagesFolder.file(`${i}.${safeImageExt}`, imgBuffer);
            }
        } catch {
            console.warn(`[download] Could not fetch image for token ${i}`);
        }

        // Fetch metadata
        const metaPath = `collections/${collectionId}/${i}.json`;
        const metaPublicUrl = getStoragePublicUrl(NFT_BUCKETS.METADATA, metaPath);

        try {
            const metaRes = await fetch(metaPublicUrl);
            if (metaRes.ok) {
                const metaText = await metaRes.text();
                metadataFolder.file(`${i}.json`, metaText);
            }
        } catch {
            console.warn(`[download] Could not fetch metadata for token ${i}`);
        }
    }

    // Add README
    zip.file('README.txt', buildReadme(collectionName, tokenCount));

    // Add manifest
    zip.file('_collection.json', JSON.stringify({
        collection_id: collectionId,
        name: collectionName,
        total_supply: tokenCount,
        exported_at: new Date().toISOString(),
        source: 'The Lily Pad — https://thelilypad.io',
        instructions: 'Upload the images/ folder to IPFS, update image CID in metadata/ files, then upload metadata/ folder to IPFS.',
    }, null, 2));

    onProgress?.(tokenCount, tokenCount, 'Compressing ZIP…');

    return zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });
}

/**
 * Trigger a browser download of the collection ZIP.
 */
export async function triggerCollectionDownload(
    collectionId: string,
    collectionName: string,
    tokenCount: number,
    imageExt = 'png',
    onProgress?: UploadProgressCallback
): Promise<void> {
    const zipBlob = await downloadCollectionAsZip(
        collectionId,
        collectionName,
        tokenCount,
        imageExt,
        onProgress
    );

    const safeName = collectionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}-assets.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildReadme(collectionName: string, tokenCount: number): string {
    return `
${collectionName} — NFT Collection Assets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Exported from The Lily Pad (https://thelilypad.io)

CONTENTS
  images/       ${tokenCount} composited NFT images
  metadata/     ${tokenCount} JSON metadata files
  _collection.json  Collection manifest

HOW TO LAUNCH ON AN EXTERNAL LAUNCHPAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Upload the images/ folder to IPFS (Pinata, NFT.Storage, etc.)
   → Note the resulting CID (e.g. Qm… or bafy…)

2. Update each metadata/ file:
   Replace the "image" field with:
   "image": "ipfs://<YOUR_IMAGE_CID>/<token_id>.png"

3. Upload the updated metadata/ folder to IPFS
   → Note the metadata CID

4. Use the metadata CID as your base URI when deploying on:
   • Magic Eden Creator Studio
   • Tensor Launchpad
   • Candy Machine (Solana)
   • OpenSea (EVM)
   • Any XLS-20 compatible XRPL launchpad

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${new Date().toUTCString()}
`.trim();
}
