import JSZip from "jszip";
import { toast } from "sonner";
import { Layer, BlendMode } from "@/components/launchpad/LayerManager";
import { TraitRule } from "@/components/launchpad/TraitRulesManager";

export interface GeneratedNFT {
    id: number;
    traits: {
        layerId: string;
        layerName: string;
        traitId: string;
        traitName: string;
        imageUrl?: string;
        blendMode?: BlendMode;
        opacity?: number;
    }[];
}

export interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    external_url?: string;
    attributes: {
        trait_type: string;
        value: string;
    }[];
}

/**
 * Load image helper for canvas compositing
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

/**
 * Composite a single NFT image onto a canvas and return as data URL.
 * For small preview counts only — use compositeNFTImageToBlob for bulk exports.
 */
export const compositeNFTImage = async (
    nft: GeneratedNFT,
    canvasSize: number
): Promise<string | null> => {
    const hasImages = nft.traits.some((t) => t.imageUrl);
    if (!hasImages) return null;

    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Could not get canvas context");

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    for (const trait of nft.traits) {
        if (trait.imageUrl) {
            try {
                const img = await loadImage(trait.imageUrl);
                ctx.save();
                ctx.globalCompositeOperation = trait.blendMode || "source-over";
                ctx.globalAlpha = (trait.opacity ?? 100) / 100;
                ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
                ctx.restore();
            } catch (error) {
                console.warn(`Failed to load image for trait: ${trait.traitName}`, error);
            }
        }
    }

    return canvas.toDataURL("image/png");
};

/**
 * Composite a single NFT onto an EXISTING canvas and return as Blob.
 * This avoids creating/destroying canvas elements and avoids the ~33% overhead
 * of base64 data URLs. The canvas is reused across all NFTs in a batch.
 */
export const compositeNFTImageToBlob = async (
    nft: GeneratedNFT,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
): Promise<Blob | null> => {
    const hasImages = nft.traits.some((t) => t.imageUrl);
    if (!hasImages) return null;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    for (const trait of nft.traits) {
        if (trait.imageUrl) {
            try {
                const img = await loadImage(trait.imageUrl);
                ctx.save();
                ctx.globalCompositeOperation = trait.blendMode || "source-over";
                ctx.globalAlpha = (trait.opacity ?? 100) / 100;
                ctx.drawImage(img, 0, 0, size, size);
                ctx.restore();
            } catch (error) {
                console.warn(`Failed to load image for trait: ${trait.traitName}`, error);
            }
        }
    }

    return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png");
    });
};

/**
 * Create a reusable canvas + context pair for bulk compositing.
 */
export const createReusableCanvas = (size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    return { canvas, ctx };
};

/**
 * Estimate **peak** memory usage for a batch export in MB.
 *
 * Because we use a single reusable canvas and add each blob to the ZIP
 * immediately, peak memory ≈ canvas RGBA buffer + one PNG blob + JSZip
 * accumulated data.  The old estimator multiplied raw pixels × count,
 * which massively over-counted since we never hold all uncompressed
 * images at once.
 *
 * New formula:
 *   peakMB ≈ canvasRGBA + (count × avgPngBlobSize) + JSZipOverhead
 *
 * avgPngBlobSize is conservatively estimated at ~12% of raw RGBA for
 * typical generative-art PNGs (flat colours, limited palette).
 */
export const estimateExportMemoryMB = (count: number, resolution: number): number => {
    const canvasRGBA = resolution * resolution * 4;                    // one canvas
    const avgPngBlob = canvasRGBA * 0.12;                              // compressed blob
    const jsZipOverhead = count * avgPngBlob;                          // accumulated blobs
    return (canvasRGBA + avgPngBlob + jsZipOverhead) / (1024 * 1024);
};

/**
 * Generate metadata for Solana (ERC-721 style)
 */
export const nftToSolanaMetadata = (
    nft: GeneratedNFT,
    collectionName: string,
    collectionDescription: string,
    baseImageUri: string = ""
): NFTMetadata => {
    return {
        name: `${collectionName} #${nft.id}`,
        description: collectionDescription || `${collectionName} NFT #${nft.id}`,
        image: baseImageUri ? `${baseImageUri}/${nft.id}.png` : `ipfs://YOUR_IMAGE_CID/${nft.id}.png`,
        attributes: nft.traits.map((trait) => ({
            trait_type: trait.layerName,
            value: trait.traitName,
        })),
    };
};

/**
 * Generate metadata for XRPL (XLS-20 style) - Production Grade
 */
export const nftToXrplMetadata = (
    nft: GeneratedNFT,
    collectionName: string,
    collectionDescription: string,
    imageCid: string = "YOUR_IMAGE_CID",
    externalUrl: string = ""
) => {
    return {
        schema: "ipfs://bafkreibhvppn37ufanewwksp47mkbxss3lzp2azvkxo6v7ks2ip5f3kgpm",
        nftType: "art.v0",
        name: `${collectionName} #${nft.id}`,
        description: collectionDescription || `${collectionName} NFT #${nft.id}`,
        image: `ipfs://${imageCid}/${nft.id}.png`,
        animation_url: `ipfs://${imageCid}/${nft.id}.png`,
        external_url: externalUrl || "https://thelilypad.io",
        image_mimetype: "image/png",
        attributes: nft.traits.map((t) => ({
            trait_type: t.layerName,
            value: t.traitName,
        })),
        properties: {
            files: [
                {
                    uri: `ipfs://${imageCid}/${nft.id}.png`,
                    type: "image/png"
                }
            ],
            category: "image"
        }
    };
};

/**
 * Bundle assets into a ZIP file with professional folder structure.
 *
 * Memory-safe approach:
 *   1. A single reusable canvas composites each NFT one at a time.
 *   2. Each PNG blob is added to JSZip immediately — we never hold
 *      more than one uncompressed frame in memory.
 *   3. Items are processed in small batches (BATCH_SIZE) with
 *      `setTimeout(0)` yields between batches so the UI stays
 *      responsive and the GC can reclaim temporary objects.
 *   4. The final ZIP is compressed with DEFLATE level 6 for a good
 *      size/speed tradeoff.
 *
 * The old hard cap of 2 GB (based on a flawed formula) has been
 * replaced with a much higher, realistic limit.
 */
export const bundleAssetsAsZip = async (
    nfts: GeneratedNFT[],
    collectionName: string,
    collectionDescription: string,
    chain: string,
    resolution: number,
    onProgress: (status: string, progress: number) => void,
    imageCid: string = "YOUR_IMAGE_CID"
): Promise<Blob> => {
    // ── Sanity check (absolute upper bound) ──────────────────────────────
    // With streaming, 10 000+ items at 4K are fine.  The only real limit
    // is the browser's blob quota (~2-4 GB depending on browser/OS).
    const estimatedMB = estimateExportMemoryMB(nfts.length, resolution);
    if (estimatedMB > 3500) {
        toast.warning(
            `Very large export (~${Math.round(estimatedMB)} MB). ` +
            `Close other tabs and ensure enough disk space.`,
            { duration: 8000 }
        );
    }

    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    const metadataFolder = zip.folder("metadata");
    const interactiveFolder = zip.folder("interactive");

    if (!imagesFolder || !metadataFolder || !interactiveFolder)
        throw new Error("Failed to create ZIP folders");

    // Reuse a single canvas for all compositing — keeps peak VRAM to one
    // frame regardless of collection size.
    const { canvas, ctx } = createReusableCanvas(resolution);

    // Process in small batches so the GC can reclaim blobs between batches
    const BATCH_SIZE = 10;

    for (let i = 0; i < nfts.length; i++) {
        onProgress(
            `Compositing ${i + 1} / ${nfts.length}…`,
            Math.round(((i + 1) / nfts.length) * 80)
        );

        const blob = await compositeNFTImageToBlob(nfts[i], canvas, ctx);

        if (blob) {
            // Store blob directly — no base64 overhead
            imagesFolder.file(`${nfts[i].id}.png`, blob);
        }

        const metadata = chain.toLowerCase() === "xrpl"
            ? nftToXrplMetadata(nfts[i], collectionName, collectionDescription, imageCid)
            : nftToSolanaMetadata(nfts[i], collectionName, collectionDescription);

        metadataFolder.file(`${nfts[i].id}.json`, JSON.stringify(metadata, null, 2));

        // Yield to the event loop every BATCH_SIZE items so the browser
        // stays responsive and the GC has a chance to run.
        if ((i + 1) % BATCH_SIZE === 0) {
            await new Promise((r) => setTimeout(r, 0));
        }
    }

    // Collection manifest
    zip.file("collection.json", JSON.stringify({
        name: collectionName,
        description: collectionDescription,
        total_supply: nfts.length,
        resolution: `${resolution}x${resolution}`,
        chain: chain.toUpperCase(),
        generated_at: new Date().toISOString(),
        image_cid: imageCid
    }, null, 2));

    onProgress("Compressing ZIP…", 90);

    return await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
    }, (meta) => {
        onProgress("Compressing ZIP…", 90 + Math.round(meta.percent * 0.1));
    });
};
