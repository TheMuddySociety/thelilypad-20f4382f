import { WebIrys } from "@irys/sdk";
import { ethers } from "ethers";

/**
 * Irys (Arweave) Integration Client
 * Handles permanent storage for Solana, Monad (EVM), and XRPL.
 *
 * ── Optimised for bulk uploads ────────────────────────────────────────────
 * • Caches the WebIrys instance per wallet address so we don't reinitialise
 *   for every file (the old code created a fresh instance per upload).
 * • Pre-funds the node for the entire batch upfront instead of checking
 *   price/balance individually.
 * • Adds exponential-backoff retry (up to 3 attempts) per upload so a
 *   transient network hiccup doesn't kill a 500-item upload.
 * • `uploadBatchToArweave` processes items in small windows with progress
 *   callbacks and yields to the event loop between windows.
 */

export const IRYS_NODE_DEV = "https://devnet.irys.xyz";
export const IRYS_NODE_MAIN = "https://node1.irys.xyz";

// ── Irys instance cache ──────────────────────────────────────────────────

interface CachedIrys {
    irys: WebIrys;
    address: string;
    chainType: string;
    network: string;
}

let _cachedIrys: CachedIrys | null = null;

/**
 * Get (or reuse) a WebIrys instance for the given wallet.
 * The instance is cached per wallet address + chain so it survives
 * across multiple uploads in the same session.
 */
export async function getWebIrys(
    wallet: {
        address: string | null;
        chainType: string;
        network: string;
    },
): Promise<WebIrys> {
    // Return cached if it matches
    if (
        _cachedIrys &&
        _cachedIrys.address === wallet.address &&
        _cachedIrys.chainType === wallet.chainType &&
        _cachedIrys.network === wallet.network
    ) {
        return _cachedIrys.irys;
    }

    const isMainnet = wallet.network === "mainnet";
    const nodeUrl = isMainnet ? IRYS_NODE_MAIN : IRYS_NODE_DEV;

    let irys: WebIrys;

    if (wallet.chainType === "solana") {
        const provider = (window as any).phantom?.solana || (window as any).solana;
        if (!provider) throw new Error("Solana wallet not detected");

        irys = new WebIrys({
            url: nodeUrl,
            token: "solana",
            wallet: { provider },
        });
    } else if (wallet.chainType === "monad" || wallet.chainType === "ethereum") {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        irys = new WebIrys({
            url: nodeUrl,
            token: "ethereum",
            wallet: { provider },
        });
    } else {
        throw new Error(
            `Irys storage payment not yet configured for ${wallet.chainType}. Please use Solana or Monad for payment.`
        );
    }

    await irys.ready();

    _cachedIrys = {
        irys,
        address: wallet.address || "",
        chainType: wallet.chainType,
        network: wallet.network,
    };

    return irys;
}

/** Clear the cached Irys instance (e.g. on wallet disconnect). */
export function clearIrysCache() {
    _cachedIrys = null;
}

// ── Retry helper ─────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_500;

async function withRetry<T>(
    fn: () => Promise<T>,
    label: string,
    retries = MAX_RETRIES,
): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            if (attempt === retries) throw err;

            const delay = BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 500;
            console.warn(
                `[Irys] ${label} failed (attempt ${attempt}/${retries}), retrying in ${Math.round(delay)}ms…`,
                err.message
            );
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw new Error("Unreachable"); // for TS
}

// ── Single-file upload ───────────────────────────────────────────────────

/**
 * Upload a single file to Arweave via Irys.
 * Includes automatic retry on transient failures.
 */
export async function uploadToArweave(
    file: File | Blob,
    wallet: any,
    isMutable = false,
    rootTx?: string,
    feeMultiplier?: number
): Promise<string> {
    const irys = await getWebIrys(wallet);

    // Check price and balance — fund if needed
    const price = await irys.getPrice(file.size);
    const balance = await irys.getLoadedBalance();

    if (balance.lt(price)) {
        const toFund = price.minus(balance);
        console.log(`[Irys] Funding node with ${toFund.toString()} (multiplier: ${feeMultiplier || 1})…`);
        await irys.fund(toFund, feeMultiplier);
    }

    const tags = [
        { name: "Content-Type", value: file.type || "application/octet-stream" },
        { name: "application-id", value: "The Lily Pad" },
    ];

    if (isMutable && rootTx) {
        tags.push({ name: "Root-TX", value: rootTx });
    }

    const data = await file.arrayBuffer();

    return withRetry(async () => {
        const response = await irys.upload(new Uint8Array(data) as any, { tags });
        return isMutable
            ? `https://gateway.irys.xyz/mutable/${rootTx || response.id}`
            : `https://arweave.net/${response.id}`;
    }, `upload ${(file as File).name || "blob"}`);
}

// ── Large-file chunked upload ────────────────────────────────────────────

export interface ChunkedUploadInstance {
    urlPromise: Promise<string>;
    pause: () => void;
    resume: () => void;
    getResumeData: () => string | undefined;
}

/**
 * Uploads a large file to Irys using the dedicated Chunked Uploader.
 * Great for massive video/audio/3D files as it avoids hitting bundle limits.
 * Provides fine-grained progress feedback through `uploader.on("chunkUpload")`.
 * 
 * @param file The large file to upload
 * @param wallet The wallet instance to initialize Irys
 * @param onProgress Callback function for chunk-by-chunk progress percentage (0-100)
 * @param isMutable Whether the upload is part of a mutable series
 * @param feeMultiplier Optional network fee multiplier
 * @param chunkSize Optional size of each chunk to upload at once (defaults to 25MB)
 * @param batchSize Optional number of chunks to upload at once (defaults to 5)
 * @param resumeData Optional base64 string provided by a previous failed instance to skip already uploaded chunks
 */
export async function uploadFileChunkedToArweave(
    file: File | Blob,
    wallet: any,
    onProgress?: (progressPct: number, uploadedBytes: number, totalBytes: number) => void,
    isMutable = false,
    rootTx?: string,
    feeMultiplier?: number,
    chunkSize = 25_000_000,
    batchSize = 5,
    resumeData?: string
): Promise<ChunkedUploadInstance> {
    const irys = await getWebIrys(wallet);

    // Check price and balance — fund if needed
    const price = await irys.getPrice(file.size);
    const balance = await irys.getLoadedBalance();

    if (balance.lt(price)) {
        const toFund = price.minus(balance);
        console.log(`[Irys] Funding node for chunked upload with ${toFund.toString()} (multiplier: ${feeMultiplier || 1})…`);
        await irys.fund(toFund, feeMultiplier);
    }

    const tags = [
        { name: "Content-Type", value: file.type || "application/octet-stream" },
        { name: "application-id", value: "The Lily Pad" },
    ];

    if (isMutable && rootTx) {
        tags.push({ name: "Root-TX", value: rootTx });
    }

    const data = await file.arrayBuffer();

    // Create the chunked uploader object specific to this file as per Irys best practices
    const uploader = irys.uploader.chunkedUploader;

    // Adjust chunk size and batch size for network conditions.
    uploader.setChunkSize(chunkSize);
    uploader.setBatchSize(batchSize);

    // If a previous upload failed or expired, we can resume exactly where it left off
    if (resumeData) {
        uploader.setResumeData(resumeData);
    }

    if (onProgress) {
        uploader.on("chunkUpload", (info: any) => {
            const progress = (info.totalUploaded / file.size) * 100;
            onProgress(Math.max(0, Math.min(100, progress)), info.totalUploaded, file.size);
        });

        uploader.on("chunkError", (e: any) => {
            console.error(`[Irys] Error uploading chunk:`, e);
        });
    }

    // Return an unawaited promise alongside controls so the host app can pause/resume
    const urlPromise = withRetry(async () => {
        // Note: The Web Irys chunkedUploader expects Buffer/Uint8Array in the browser.
        // It returns an AxiosResponse wrapping the generic UploadResponse data object.
        const res: any = await uploader.uploadData(new Uint8Array(data) as any, { tags });
        const txId = res?.data?.id || res?.id;

        if (!txId) {
            throw new Error("Failed to receive valid transaction ID from Chunked Uploader.");
        }

        return isMutable
            ? `https://gateway.irys.xyz/mutable/${rootTx || txId}`
            : `https://arweave.net/${txId}`;
    }, `chunked upload ${(file as File).name || "blob"}`);

    return {
        urlPromise,
        pause: () => uploader.pause(),
        resume: () => uploader.resume(),
        getResumeData: () => {
            // Check if getResumeData is available internally on the chunked uploader
            if (typeof uploader.getResumeData === 'function') {
                return uploader.getResumeData();
            }
            return undefined;
        }
    };
}

/**
 * Uploads a large file to Irys using the Chunked Uploader in Transaction Mode.
 * This is useful if you want to sign the transaction first, verify it or defer it,
 * and then upload the chunks.
 * 
 * @param file The large file to upload
 * @param wallet The wallet instance to initialize Irys
 * @param onProgress Callback function for chunk-by-chunk progress percentage (0-100)
 * @param isMutable Whether the upload is part of a mutable series
 * @param rootTx Origin transaction for mutables
 * @param feeMultiplier Optional network fee multiplier
 * @param chunkSize Optional size of each chunk to upload at once (defaults to 25MB)
 * @param batchSize Optional number of chunks to upload at once (defaults to 5)
 * @param resumeData Optional base64 string provided by a previous failed instance to skip already uploaded chunks
 */
export async function uploadChunkedTransactionToArweave(
    file: File | Blob,
    wallet: any,
    onProgress?: (progressPct: number, uploadedBytes: number, totalBytes: number) => void,
    isMutable = false,
    rootTx?: string,
    feeMultiplier?: number,
    chunkSize = 25_000_000,
    batchSize = 5,
    resumeData?: string
): Promise<ChunkedUploadInstance> {
    const irys = await getWebIrys(wallet);

    // Check price and balance — fund if needed
    const price = await irys.getPrice(file.size);
    const balance = await irys.getLoadedBalance();

    if (balance.lt(price)) {
        const toFund = price.minus(balance);
        console.log(`[Irys] Funding node for chunked tx upload with ${toFund.toString()} (multiplier: ${feeMultiplier || 1})…`);
        await irys.fund(toFund, feeMultiplier);
    }

    const tags = [
        { name: "Content-Type", value: file.type || "application/octet-stream" },
        { name: "application-id", value: "The Lily Pad" },
    ];

    if (isMutable && rootTx) {
        tags.push({ name: "Root-TX", value: rootTx });
    }

    const data = await file.arrayBuffer();

    // 1. Transaction Mode: Create & Sign First
    const transaction = irys.createTransaction(new Uint8Array(data) as any, { tags });
    await transaction.sign();

    // Create the chunked uploader object specific to this file
    const uploader = irys.uploader.chunkedUploader;
    uploader.setChunkSize(chunkSize);
    uploader.setBatchSize(batchSize);

    // Resume from expired or paused session if provided
    if (resumeData) {
        uploader.setResumeData(resumeData);
    }

    if (onProgress) {
        uploader.on("chunkUpload", (info: any) => {
            const progress = (info.totalUploaded / file.size) * 100;
            onProgress(Math.max(0, Math.min(100, progress)), info.totalUploaded, file.size);
        });

        uploader.on("chunkError", (e: any) => {
            console.error(`[Irys] Error uploading chunk via TX:`, e);
        });
    }

    // Return an unawaited promise alongside controls so the host app can pause/resume
    const urlPromise = withRetry(async () => {
        // 2. Upload the fully signed transaction bundle via chunked uploader
        const res: any = await uploader.uploadTransaction(transaction);
        const txId = res?.data?.id || res?.id || transaction.id;

        if (!txId) {
            throw new Error("Failed to receive transaction ID from Chunked TX Uploader.");
        }

        return isMutable
            ? `https://gateway.irys.xyz/mutable/${rootTx || txId}`
            : `https://arweave.net/${txId}`;
    }, `chunked tx upload ${(file as File).name || "blob"}`);

    return {
        urlPromise,
        pause: () => uploader.pause(),
        resume: () => uploader.resume(),
        getResumeData: () => {
            if (typeof uploader.getResumeData === 'function') {
                return uploader.getResumeData();
            }
            return undefined;
        }
    };
}

/**
 * Upload JSON metadata to Arweave via Irys.
 */
export async function uploadMetadataToArweave(metadata: any, wallet: any, isMutable = false, rootTx?: string): Promise<string> {
    const json = JSON.stringify(metadata, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const file = new File([blob], "metadata.json", { type: "application/json" });

    return uploadToArweave(file, wallet, isMutable, rootTx);
}

// ── Batch upload with thumbnail generation ───────────────────────────────

import { generateThumbnails, type ProcessedImage } from "@/lib/thumbnailGenerator";

export interface BatchUploadItem {
    /** The image file to upload */
    file: File | Blob;
    /**
     * Metadata builder — receives all image URIs so you can embed them.
     * `imageUri` = full-res original, `thumbUri` = 512px, `previewUri` = 1200px.
     */
    buildMetadata: (imageUri: string, thumbUri?: string, previewUri?: string) => any;
}

export interface BatchUploadResult {
    tokenId: number;
    arweaveUri: string;           // metadata URI
    arweaveImageUri: string;      // full-res image URI
    arweaveThumbUri: string;      // 512px thumbnail URI
    arweavePreviewUri: string;    // 1200px preview URI
}

export interface BatchUploadResponse {
    items: BatchUploadResult[];
    manifestUri?: string;         // The Irys Onchain Folder base URI
}

/**
 * Upload an entire collection to Arweave in optimised batches.
 *
 * Pipeline per item:
 *   1. Generate 512px WebP thumbnail + 1200px WebP preview (client-side)
 *   2. Upload full-res original, thumbnail, & preview to Arweave
 *   3. Build metadata JSON (with all 3 URIs) and upload it
 *
 * Features:
 * • Pre-funds the Irys node for the estimated total size upfront
 *   (original + thumb + preview + metadata per item).
 * • Processes items in small windows (default 3 concurrent) with
 *   progress callbacks so the UI stays responsive.
 * • Retries each individual upload up to 3 times with exponential backoff.
 * • Yields to the event loop between windows to prevent UI freeze.
 * • Thumbnail generation uses Web Workers so it doesn't block the main thread.
 *
 * @param enableThumbnails  Set to false to skip thumbnail generation
 * @param enableThumbnails  Set to false to skip thumbnail generation
 * @param customTags        Additional Irys/Arweave tags to attach to each upload
 * @param isMutable         Set to true to generate a mutable manifest URI
 * @param rootTx            The transaction ID of the original manifest (required for updating mutables)
 * @param feeMultiplier     Optional multiplier (e.g. 1.2) to prioritize funding transactions
 */
export async function uploadBatchToArweave(
    items: BatchUploadItem[],
    wallet: any,
    onProgress?: (completed: number, total: number, status: string) => void,
    concurrency = 3,
    enableThumbnails = true,
    customTags: { name: string; value: string }[] = [],
    isMutable = false,
    rootTx?: string,
    feeMultiplier?: number
): Promise<BatchUploadResponse> {
    if (items.length === 0) return { items: [] };

    const irys = await getWebIrys(wallet);

    // ── Phase 1: Generate thumbnails ─────────────────────────────────────
    let processedImages: ProcessedImage[] | null = null;

    if (enableThumbnails) {
        onProgress?.(0, items.length, "Generating thumbnails…");

        processedImages = [];
        for (let i = 0; i < items.length; i += concurrency) {
            const windowFiles = items
                .slice(i, i + concurrency)
                .map((item) =>
                    item.file instanceof File
                        ? item.file
                        : new File([item.file], `image_${i}.png`, { type: item.file.type })
                );

            const windowResults = await Promise.all(
                windowFiles.map((f) => generateThumbnails(f))
            );
            processedImages.push(...windowResults);

            const done = Math.min(i + concurrency, items.length);
            onProgress?.(done, items.length, `Generated thumbnails: ${done} / ${items.length}`);

            // Yield to event loop
            await new Promise((r) => setTimeout(r, 0));
        }
    }

    // ── Phase 2: Pre-fund estimate ───────────────────────────────────────
    onProgress?.(0, items.length, "Estimating storage cost…");

    // Estimate total bytes: original + thumb + preview + ~4KB metadata each
    const totalBytes = items.reduce((sum, item, idx) => {
        const origSize = item.file.size || 10_000_000; // 10 MB conservative default for 4000x4000
        const thumbSize = processedImages?.[idx]?.thumb?.size || 150_000; // ~150 KB WebP
        const previewSize = processedImages?.[idx]?.preview?.size || 1_500_000; // ~1.5 MB WebP
        return sum + origSize + thumbSize + previewSize + 4_096;
    }, 0);

    const price = await irys.getPrice(totalBytes);
    const balance = await irys.getLoadedBalance();

    if (balance.lt(price)) {
        // Fund with dynamic buffer (1.5x for large collections, 1.25x for small)
        const toFund = price.minus(balance).multipliedBy(items.length > 500 ? 1.5 : 1.25);
        onProgress?.(0, items.length, "Funding Arweave node…");
        console.log(
            `[Irys] Pre-funding node with ${toFund.toString()} for ~${items.length} items (+ thumbnails) (multiplier: ${feeMultiplier || 1})…`
        );
        await withRetry(() => irys.fund(toFund, feeMultiplier), "pre-fund");
    }

    // ── Phase 3: Upload loop ─────────────────────────────────────────────
    const results: BatchUploadResult[] = new Array(items.length);
    const makeTags = (type: string, isFolder: boolean = false) => {
        const baseTags = [
            { name: "Content-Type", value: type || "application/octet-stream" },
            { name: "application-id", value: "The Lily Pad" },
            { name: "generator", value: "Lily Pad Launchpad" },
        ];

        // Don't add custom collection tags to manifest itself since it's an Irys internal type, 
        // but it's safe to add if needed. We'll add custom tags everywhere.
        return [...baseTags, ...customTags];
    };

    for (let i = 0; i < items.length; i += concurrency) {
        const window = items.slice(i, i + concurrency);

        const windowResults = await Promise.all(
            window.map(async (item, idx) => {
                const globalIdx = i + idx;
                try {
                    onProgress?.(globalIdx, items.length, `Uploading item ${globalIdx + 1}/${items.length}…`);
                    const processed = processedImages?.[globalIdx];

                    // 1. Upload full-res image
                    const imgData = await item.file.arrayBuffer();
                    const imgUri = await withRetry(async () => {
                        const res = await irys.upload(new Uint8Array(imgData) as any, {
                            tags: makeTags(item.file.type),
                        });
                        return `https://arweave.net/${res.id}`;
                    }, `image #${globalIdx + 1}`);

                    // 2. Upload thumbnail (if generated)
                    let thumbUri = imgUri; // fallback to full if no thumb
                    if (processed?.thumb && processed.thumb !== processed.original) {
                        const thumbData = await processed.thumb.arrayBuffer();
                        thumbUri = await withRetry(async () => {
                            const res = await irys.upload(new Uint8Array(thumbData) as any, {
                                tags: makeTags("image/webp"),
                            });
                            return `https://arweave.net/${res.id}`;
                        }, `thumb #${globalIdx + 1}`);
                    }

                    // 3. Upload preview (if generated)
                    let previewUri = imgUri; // fallback to full if no preview
                    if (processed?.preview && processed.preview !== processed.original) {
                        const prevData = await processed.preview.arrayBuffer();
                        previewUri = await withRetry(async () => {
                            const res = await irys.upload(new Uint8Array(prevData) as any, {
                                tags: makeTags("image/webp"),
                            });
                            return `https://arweave.net/${res.id}`;
                        }, `preview #${globalIdx + 1}`);
                    }

                    // 4. Build & upload metadata (with all image URIs)
                    const metadata = item.buildMetadata(imgUri, thumbUri, previewUri);
                    const metaJson = JSON.stringify(metadata, null, 2);
                    const metaData = new TextEncoder().encode(metaJson);
                    const metaUri = await withRetry(async () => {
                        const res = await irys.upload(metaData as any, {
                            tags: makeTags("application/json"),
                        });
                        return `https://arweave.net/${res.id}`;
                    }, `metadata #${globalIdx + 1}`);

                    return {
                        tokenId: globalIdx,
                        arweaveUri: metaUri,
                        arweaveImageUri: imgUri,
                        arweaveThumbUri: thumbUri,
                        arweavePreviewUri: previewUri,
                    } satisfies BatchUploadResult;
                } catch (err) {
                    console.error(`[Irys] Item ${globalIdx + 1} failed:`, err);
                    onProgress?.(globalIdx, items.length, `Item ${globalIdx + 1} failed — skipping`);
                    return null;
                }
            })
        );

        for (const r of windowResults) {
            if (r) results[r.tokenId] = r;
        }

        const completed = Math.min(i + concurrency, items.length);
        onProgress?.(
            completed,
            items.length,
            `Uploaded ${completed} / ${items.length} to Arweave…`
        );

        // Yield to event loop every window
        await new Promise((r) => setTimeout(r, 0));
    }

    // Filter out nulls in case any items failed
    const finalResults = results.filter(Boolean);

    // ── Phase 4: Create Onchain Folder (Manifest) ────────────────────────
    let manifestUri: string | undefined = undefined;

    if (finalResults.length > 0) {
        try {
            onProgress?.(finalResults.length, items.length, "Creating onchain folder manifest…");
            const map = new Map<string, string>();

            finalResults.forEach((r, i) => {
                // Add metadata 
                const metaId = r.arweaveUri.split("/").pop();
                if (metaId) map.set(`${i}.json`, metaId);

                // Add images
                const imgId = r.arweaveImageUri.split("/").pop();
                if (imgId) {
                    const originalExt = items[i]?.file instanceof File ? items[i].file.name.split('.').pop() || 'png' : 'png';
                    map.set(`${i}.${originalExt}`, imgId);
                }

                if (r.arweaveThumbUri && r.arweaveThumbUri !== r.arweaveImageUri) {
                    const thumbId = r.arweaveThumbUri.split("/").pop();
                    if (thumbId) map.set(`${i}_thumb.webp`, thumbId);
                }

                if (r.arweavePreviewUri && r.arweavePreviewUri !== r.arweaveImageUri) {
                    const previewId = r.arweavePreviewUri.split("/").pop();
                    if (previewId) map.set(`${i}_preview.webp`, previewId);
                }
            });

            // Need to generate folder via Irys uploader
            // ensure uploader and generateFolder are available
            const uploaderAny = irys.uploader as any;
            if (uploaderAny && typeof uploaderAny.generateFolder === 'function') {
                const manifestObj = await uploaderAny.generateFolder({ items: map });

                const tags = [
                    { name: "Type", value: "manifest" },
                    { name: "Content-Type", value: "application/x.irys-manifest+json" },
                    { name: "application-id", value: "The Lily Pad" },
                    ...customTags
                ];

                // For mutability: link subsequent updates to the original manifest ID via Root-TX
                if (isMutable && rootTx) {
                    tags.push({ name: "Root-TX", value: rootTx });
                }

                const receipt = await withRetry(async () => {
                    return await irys.upload(JSON.stringify(manifestObj), { tags });
                }, "manifest upload");

                // Output a mutable reference gateway URI if mutability is requested
                manifestUri = isMutable
                    ? `https://gateway.irys.xyz/mutable/${rootTx || receipt.id}`
                    : `https://arweave.net/${receipt.id}`;
                console.log(`[Irys] Onchain folder created at ${manifestUri}`);
            } else {
                console.warn("[Irys] irys.uploader.generateFolder is not available in this SDK version.");
            }
        } catch (err) {
            console.error("[Irys] Failed to create onchain folder manifest:", err);
            // Non-fatal, just log it. We still have all the individual URIs.
        }
    }

    return { items: finalResults, manifestUri };
}

// ── Receipt Verification ─────────────────────────────────────────────────

/**
 * Retrieves the cryptographically signed receipt and accurate timestamp generated by Irys.
 * Receipts prove the exact millisecond a file/transaction was verified.
 * 
 * @param transactionId The Arweave/Irys transaction ID (e.g. from arweave.net/<txId>)
 * @param wallet The wallet instance to initialize Irys
 */
export async function getIrysReceipt(transactionId: string, wallet: any) {
    const irys = await getWebIrys(wallet);
    try {
        const receipt = await irys.utils.getReceipt(transactionId);
        return receipt;
    } catch (e) {
        console.error(`[Irys] Error getting receipt for TX ${transactionId}:`, e);
        throw e;
    }
}

/**
 * Validates a receipt's deep hash signature to cryptographically guarantee timestamp integrity.
 * 
 * @param receipt The receipt object previously fetched from getIrysReceipt
 * @param wallet The wallet instance to initialize Irys
 */
export async function verifyIrysReceipt(receipt: any, wallet: any): Promise<boolean> {
    const irys = await getWebIrys(wallet);
    try {
        // verifyReceipt returns a boolean indicating whether the signature check passed
        const isValid = await irys.utils.verifyReceipt(receipt);
        return isValid;
    } catch (e) {
        console.error(`[Irys] Error verifying receipt:`, e);
        return false;
    }
}

// ── Manual Node Funding ──────────────────────────────────────────────────

/**
 * Manually tops up the connected wallet's Irys node balance using standard crypto units (e.g. 0.05 SOL).
 * Automatically converts the standard amount to atomic units (lamports/wei) before funding.
 * 
 * @param amountStandard The amount of crypto to fund in standard readable units (e.g. 0.1)
 * @param wallet The wallet instance to initialize Irys
 * @param feeMultiplier Optional multiplier to prioritize the funding transaction (e.g. 1.2)
 */
export async function fundIrysNode(amountStandard: number, wallet: any, feeMultiplier?: number) {
    const irys = await getWebIrys(wallet);
    try {
        const amountAtomic = irys.utils.toAtomic(amountStandard);
        console.log(`[Irys] Manually funding node with ${amountStandard} ${irys.token} (${amountAtomic.toString()} atomic)…`);

        const fundTx = await irys.fund(amountAtomic, feeMultiplier);

        console.log(`[Irys] Successfully funded ${irys.utils.fromAtomic(fundTx.quantity)} ${irys.token}`);
        return fundTx;
    } catch (e) {
        console.error(`[Irys] Error manually funding node:`, e);
        throw e;
    }
}

/**
 * Gets the current loaded balance in the Irys node.
 * 
 * @param wallet The wallet instance to initialize Irys
 * @returns The balance in standard units (e.g. SOL) as a string
 */
export async function getIrysBalance(wallet: any): Promise<string> {
    const irys = await getWebIrys(wallet);
    const atomicBalance = await irys.getLoadedBalance();
    return irys.utils.fromAtomic(atomicBalance).toString();
}

/**
 * Monitors the current loaded balance in the Irys node against a predefined standard threshold.
 * Useful for alerting a UI when a user's prepay balance falls dangerously low (e.g. < 0.1 SOL).
 * 
 * @param wallet The wallet instance to initialize Irys
 * @param thresholdStandard The threshold in standard units (e.g., 0.1) under which the function returns true.
 * @returns An object containing the current standard balance and a boolean `isBelowThreshold`.
 */
export async function checkIrysBalanceThreshold(wallet: any, thresholdStandard: number = 0.1): Promise<{
    balanceStandard: number;
    isBelowThreshold: boolean;
}> {
    const irys = await getWebIrys(wallet);
    const atomicBalance = await irys.getLoadedBalance();
    const balanceStandard = Number(irys.utils.fromAtomic(atomicBalance).toString());

    const isBelowThreshold = Math.abs(balanceStandard) <= thresholdStandard;

    if (isBelowThreshold) {
        console.warn(`[Irys] Node balance (${balanceStandard} ${irys.token}) is at or below the threshold of ${thresholdStandard}! Please fund.`);
    } else {
        console.log(`[Irys] Node balance (${balanceStandard} ${irys.token}) is healthy. Minimum threshold is ${thresholdStandard}.`);
    }

    return { balanceStandard, isBelowThreshold };
}

/**
 * Initiates a withdrawal of the user's funded node balance.
 * 
 * @param amountStandard The amount of crypto to withdraw in standard units (e.g. 0.1), or "all" to drain completely.
 * @param wallet The wallet instance to initialize Irys
 */
export async function withdrawIrysNodeBalance(amountStandard: number | "all", wallet: any) {
    const irys = await getWebIrys(wallet);
    try {
        let amountToWithdraw: any = "all";

        if (amountStandard !== "all") {
            amountToWithdraw = irys.utils.toAtomic(amountStandard);
            console.log(`[Irys] Withdrawing ${amountStandard} ${irys.token} (${amountToWithdraw.toString()} atomic)…`);
        } else {
            console.log(`[Irys] Withdrawing ALL available ${irys.token} funds…`);
        }

        const withdrawTx = await irys.withdrawBalance(amountToWithdraw);

        console.log(`[Irys] Successfully requested withdrawal for ${irys.token}.`);
        return withdrawTx;
    } catch (e) {
        console.error(`[Irys] Error withdrawing node balance:`, e);
        throw e;
    }
}

// ── General REST API ─────────────────────────────────────────────────────

/**
 * Queries the Irys general REST API for bundler information, including version and network configuration.
 *
 * @param network The target network ("mainnet" | "devnet")
 */
export async function getIrysNodeInfo(network: "mainnet" | "devnet" = "mainnet") {
    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;
    try {
        const response = await fetch(`${url}/info`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error(`[Irys] Failed to fetch node info:`, e);
        throw e;
    }
}

/**
 * Queries the Irys general REST API for public-facing data such as bundler public keys.
 *
 * @param network The target network ("mainnet" | "devnet")
 */
export async function getIrysNodePublic(network: "mainnet" | "devnet" = "mainnet") {
    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;
    try {
        const response = await fetch(`${url}/public`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error(`[Irys] Failed to fetch node public data:`, e);
        throw e;
    }
}

/**
 * Queries the Irys general REST API to check the health and operational status of the node.
 *
 * @param network The target network ("mainnet" | "devnet")
 */
export async function getIrysNodeStatus(network: "mainnet" | "devnet" = "mainnet") {
    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;
    try {
        const response = await fetch(`${url}/status`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // Sometimes /status just returns 'OK' plain text instead of JSON on some Arweave/Irys nodes
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (e) {
        console.error(`[Irys] Failed to fetch node status:`, e);
        throw e;
    }
}

/**
 * Queries the Irys general REST API to retrieve a list of historical withdrawals for the connected wallet's token.
 * Mapping for GET /account/withdrawals/{token}?address={address}
 *
 * @param wallet The wallet instance referencing the target address and config 
 * @param network The target network ("mainnet" | "devnet")
 */
export async function getIrysAccountWithdrawals(wallet: any, network: "mainnet" | "devnet" = "mainnet") {
    // We get the WebIrys instance just to easily identify the active address and token 
    const irys = await getWebIrys(wallet);
    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;

    try {
        const response = await fetch(`${url}/account/withdrawals/${irys.token}?address=${irys.address}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error(`[Irys] Failed to fetch account withdrawals:`, e);
        throw e;
    }
}

/**
 * Queries the Irys general REST API to determine the cost to upload a set number of bytes using a specific token.
 * Mapping for GET /price/{token}/{size}
 *
 * @param token The token used for payment (e.g., "ethereum", "solana", "matic"). If missing, tries to extract from wallet.
 * @param sizeInBytes The total size of the data to be uploaded, expressed in bytes
 * @param wallet Optional: If the token is not passed generically, it will extract it from the WebIrys instance connected to this wallet.
 * @param network The target network ("mainnet" | "devnet")
 */
export async function getIrysUploadPrice(
    sizeInBytes: number,
    token?: string,
    wallet?: any,
    network: "mainnet" | "devnet" = "mainnet"
) {
    let resolvedToken = token;

    // If no token string is provided, attempt to derive from the wallet instance
    if (!resolvedToken && wallet) {
        const irys = await getWebIrys(wallet);
        resolvedToken = irys.token;
    }

    if (!resolvedToken) {
        throw new Error("You must provide either a 'token' string or a valid 'wallet' instance to query the price API.");
    }

    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;

    try {
        const response = await fetch(`${url}/price/${resolvedToken}/${sizeInBytes}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // Irys typically returns the raw price as an atomic unit numeric string (e.g. Lamports/Wei)
        return await response.text();
    } catch (e) {
        console.error(`[Irys] Failed to fetch upload price via REST:`, e);
        throw e;
    }
}

// ── Transaction REST API ─────────────────────────────────────────────────

/**
 * Queries the Irys general REST API to retrieve full transaction metadata.
 * Mapping for GET /tx/{txId}
 * 
 * @param txId The unique ID of the transaction on Irys/Arweave
 * @param network The target network ("mainnet" | "devnet")
 */
export async function getIrysTransactionMetadata(txId: string, network: "mainnet" | "devnet" = "mainnet") {
    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;
    try {
        const response = await fetch(`${url}/tx/${txId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error(`[Irys] Failed to fetch transaction metadata for ${txId}:`, e);
        throw e;
    }
}

/**
 * Queries the Irys general REST API to retrieve the current status/confirmations of a transaction.
 * Mapping for GET /tx/{txId}/status
 * 
 * @param txId The unique ID of the transaction on Irys/Arweave
 * @param network The target network ("mainnet" | "devnet")
 */
export async function getIrysTransactionStatus(txId: string, network: "mainnet" | "devnet" = "mainnet") {
    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;
    try {
        const response = await fetch(`${url}/tx/${txId}/status`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error(`[Irys] Failed to fetch transaction status for ${txId}:`, e);
        throw e;
    }
}

/**
 * Queries the Irys general REST API to retrieve just the uploaded tags for a transaction.
 * Mapping for GET /tx/{txId}/tags
 * 
 * @param txId The unique ID of the transaction on Irys/Arweave
 * @param network The target network ("mainnet" | "devnet")
 */
export async function getIrysTransactionTags(txId: string, network: "mainnet" | "devnet" = "mainnet") {
    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;
    try {
        const response = await fetch(`${url}/tx/${txId}/tags`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error(`[Irys] Failed to fetch transaction tags for ${txId}:`, e);
        throw e;
    }
}

/**
 * Queries the Irys general REST API to retrieve the raw data buffer of a transaction.
 * Mapping for GET /tx/{txId}/data
 * Note: Use with caution as this can fetch the entire raw file buffer into memory.
 * 
 * @param txId The unique ID of the transaction on Irys/Arweave
 * @param network The target network ("mainnet" | "devnet")
 */
export async function getIrysTransactionData(txId: string, network: "mainnet" | "devnet" = "mainnet") {
    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;
    try {
        const response = await fetch(`${url}/tx/${txId}/data`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.arrayBuffer();
    } catch (e) {
        console.error(`[Irys] Failed to fetch raw transaction data for ${txId}:`, e);
        throw e;
    }
}

// ── Chunks REST API ──────────────────────────────────────────────────────

/**
 * Manually uploads a specific data chunk to the Irys bundler for a given transaction.
 * Mapping for POST /chunks/{token}/{txid}/{offset}
 * 
 * Note: Consider using the ChunkedUploader API (uploadFileChunkedToArweave) for automatic chunk orchestration.
 * This is provided for low-level manual chunk management.
 * 
 * @param token The token used (e.g., "ethereum", "solana")
 * @param txId The unique ID of the transaction
 * @param offset The byte offset representing the position of this chunk
 * @param data The raw binary chunk data
 * @param network The target network ("mainnet" | "devnet")
 */
export async function postIrysChunk(
    token: string,
    txId: string,
    offset: number | string,
    data: ArrayBuffer | Blob | Uint8Array,
    network: "mainnet" | "devnet" = "mainnet"
) {
    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;
    try {
        const response = await fetch(`${url}/chunks/${token}/${txId}/${offset}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream",
            },
            body: data as BodyInit,
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return true;
    } catch (e) {
        console.error(`[Irys] Failed to post chunk at offset ${offset} for ${txId}:`, e);
        throw e;
    }
}

/**
 * Retrieves a previously uploaded data chunk from the Irys bundler.
 * Mapping for GET /chunks/{token}/{txid}/{offset}
 * 
 * @param token The token used (e.g., "ethereum", "solana")
 * @param txId The unique ID of the transaction
 * @param offset The byte offset of the chunk to retrieve
 * @param network The target network ("mainnet" | "devnet")
 */
export async function getIrysChunk(
    token: string,
    txId: string,
    offset: number | string,
    network: "mainnet" | "devnet" = "mainnet"
) {
    const url = network === "mainnet" ? IRYS_NODE_MAIN : IRYS_NODE_DEV;
    try {
        const response = await fetch(`${url}/chunks/${token}/${txId}/${offset}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.arrayBuffer();
    } catch (e) {
        console.error(`[Irys] Failed to get chunk at offset ${offset} for ${txId}:`, e);
        throw e;
    }
}
