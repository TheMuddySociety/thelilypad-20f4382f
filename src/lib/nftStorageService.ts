/**
 * NFT Collection Storage Service
 *
 * High-level service for downloading NFT collections as ZIP files.
 * All uploads now go directly to Arweave via Irys — no Supabase staging.
 *
 * IPFS Pinning (via NFT.Storage):
 *   • Uses the "Preserve" API for verifiable collection-wide persistence.
 */

import JSZip from 'jszip';
import { createCollectionOnIPFS, addTokensToCollection, NFTStorageCollection } from '@/integrations/nftstorage/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StorageUploadResult {
    /** Token ID */
    tokenId: number;
    /** Public URL of the uploaded image (Arweave) */
    imageUrl: string;
    /** Public URL of the uploaded metadata JSON (Arweave) */
    metadataUrl: string;
}

export type UploadProgressCallback = (
    current: number,
    total: number,
    status: string
) => void;

// ─── Download service (creators → external launchpad) ────────────────────────

/**
 * Download a creator's collection as a ZIP file ready to upload to any
 * external launchpad (Magic Eden, OpenSea, Tensor, etc.).
 *
 * Uses Arweave URLs stored in the collection's minted_nfts records.
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
 * @param collectionId   Collection ID (used to look up Arweave URIs from DB)
 * @param collectionName Human-readable name for zip filename
 * @param tokenCount     Expected number of tokens
 * @param imageExt       Image file extension (default: 'png')
 * @param onProgress     Progress callback
 * @param arweaveUris    Optional array of Arweave URIs for each token
 */
export async function downloadCollectionAsZip(
    collectionId: string,
    collectionName: string,
    tokenCount: number,
    imageExt = 'png',
    onProgress?: UploadProgressCallback,
    arweaveUris?: { imageUri: string; metadataUri: string }[]
): Promise<Blob> {
    const zip = new JSZip();
    const imagesFolder = zip.folder('images')!;
    const metadataFolder = zip.folder('metadata')!;

    const safeImageExt = imageExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';

    for (let i = 0; i < tokenCount; i++) {
        onProgress?.(i + 1, tokenCount, `Packaging NFT ${i + 1} of ${tokenCount}…`);

        // Use provided Arweave URIs if available
        const uris = arweaveUris?.[i];

        if (uris?.imageUri) {
            try {
                const imgRes = await fetch(uris.imageUri);
                if (imgRes.ok) {
                    const imgBuffer = await imgRes.arrayBuffer();
                    imagesFolder.file(`${i}.${safeImageExt}`, imgBuffer);
                }
            } catch {
                console.warn(`[download] Could not fetch image for token ${i}`);
            }
        }

        if (uris?.metadataUri) {
            try {
                const metaRes = await fetch(uris.metadataUri);
                if (metaRes.ok) {
                    const metaText = await metaRes.text();
                    metadataFolder.file(`${i}.json`, metaText);
                }
            } catch {
                console.warn(`[download] Could not fetch metadata for token ${i}`);
            }
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
        storage: 'Arweave (permanent)',
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
    onProgress?: UploadProgressCallback,
    arweaveUris?: { imageUri: string; metadataUri: string }[]
): Promise<void> {
    const zipBlob = await downloadCollectionAsZip(
        collectionId,
        collectionName,
        tokenCount,
        imageExt,
        onProgress,
        arweaveUris
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
Storage: Arweave (permanent, decentralized)

CONTENTS
  images/       ${tokenCount} composited NFT images
  metadata/     ${tokenCount} JSON metadata files
  _collection.json  Collection manifest

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${new Date().toUTCString()}
`.trim();
}

/**
 * Professional IPFS Pinning:
 * Create a named collection on NFT.Storage and add all item CIDs to it.
 */
export async function pinCollectionToIPFS(
    collectionName: string,
    items: { tokenID: string; cid: string }[],
    contractAddress?: string
): Promise<NFTStorageCollection> {
    const collection = await createCollectionOnIPFS(collectionName, contractAddress);
    await addTokensToCollection(collection.collectionID, items);
    return collection;
}
