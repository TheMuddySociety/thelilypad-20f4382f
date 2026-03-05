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
 * Estimate memory usage for a batch export in MB.
 * Each PNG blob is roughly (resolution^2 * 4 bytes RGBA) * compression factor (~0.3-0.6).
 * We use 0.5 as a conservative estimate.
 */
export const estimateExportMemoryMB = (count: number, resolution: number): number => {
    const rawPixelBytes = resolution * resolution * 4;
    const estimatedPngBytes = rawPixelBytes * 0.5;
    return (count * estimatedPngBytes) / (1024 * 1024);
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
 * Memory-safe: reuses a single canvas and writes Blobs (not base64 strings).
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
    // ── Memory guard ──────────────────────────────────────────────────────
    const estimatedMB = estimateExportMemoryMB(nfts.length, resolution);
    if (estimatedMB > 2000) {
        const msg = `Estimated memory usage (~${Math.round(estimatedMB)} MB) is too high. Reduce count or resolution.`;
        toast.error(msg, { duration: 8000 });
        throw new Error(msg);
    }
    if (estimatedMB > 500) {
        toast.warning(
            `Large export (~${Math.round(estimatedMB)} MB). Close other tabs for best performance.`,
            { duration: 6000 }
        );
    }

    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    const metadataFolder = zip.folder("metadata");
    const interactiveFolder = zip.folder("interactive");

    if (!imagesFolder || !metadataFolder || !interactiveFolder)
        throw new Error("Failed to create ZIP folders");

    // Reuse a single canvas for all compositing
    const { canvas, ctx } = createReusableCanvas(resolution);

    for (let i = 0; i < nfts.length; i++) {
        onProgress(`Compositing ${i + 1} / ${nfts.length}…`, Math.round(((i + 1) / nfts.length) * 80));

        const blob = await compositeNFTImageToBlob(nfts[i], canvas, ctx);

        if (blob) {
            // Store blob directly — no base64 overhead
            imagesFolder.file(`${nfts[i].id}.png`, blob);
        }

        const metadata = chain.toLowerCase() === "xrpl"
            ? nftToXrplMetadata(nfts[i], collectionName, collectionDescription, imageCid)
            : nftToSolanaMetadata(nfts[i], collectionName, collectionDescription);

        metadataFolder.file(`${nfts[i].id}.json`, JSON.stringify(metadata, null, 2));

        // Yield to keep UI responsive
        if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
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
