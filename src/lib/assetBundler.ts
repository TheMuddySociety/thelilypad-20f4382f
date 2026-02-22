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
 * Composite a single NFT image onto a canvas and return as data URL
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
        image: baseImageUri ? `${baseImageUri}/${nft.id}.png` : `ipfs://YOUR_CID/${nft.id}.png`,
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
        animation_url: `ipfs://${imageCid}/${nft.id}.png`, // High-res version
        external_url: externalUrl || "https://thelilypad.io",
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
 * Bundle assets into a ZIP file with professional folder structure
 */
export const bundleAssetsAsZip = async (
    nfts: GeneratedNFT[],
    collectionName: string,
    collectionDescription: string,
    chain: string,
    resolution: number,
    onProgress: (status: string, progress: number) => void,
    imageCid: string = "CID_ESTIMATE"
): Promise<Blob> => {
    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    const metadataFolder = zip.folder("metadata");
    const interactiveFolder = zip.folder("interactive"); // Placeholder for future use

    if (!imagesFolder || !metadataFolder || !interactiveFolder)
        throw new Error("Failed to create ZIP folders");

    for (let i = 0; i < nfts.length; i++) {
        onProgress(`Compositing ${i + 1} / ${nfts.length}…`, Math.round(((i + 1) / nfts.length) * 80));

        const imageDataUrl = await compositeNFTImage(nfts[i], resolution);

        if (imageDataUrl) {
            const base64Data = imageDataUrl.split(",")[1];
            imagesFolder.file(`${nfts[i].id}.png`, base64Data, { base64: true });
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
