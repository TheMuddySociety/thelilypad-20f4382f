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
): Promise<string> {
    const irys = await getWebIrys(wallet);

    // Check price and balance — fund if needed
    const price = await irys.getPrice(file.size);
    const balance = await irys.getLoadedBalance();

    if (balance.lt(price)) {
        const toFund = price.minus(balance);
        console.log(`[Irys] Funding node with ${toFund.toString()}…`);
        await irys.fund(toFund);
    }

    const tags = [
        { name: "Content-Type", value: file.type || "application/octet-stream" },
        { name: "App-Name", value: "The Lily Pad" },
    ];

    const data = await file.arrayBuffer();

    return withRetry(async () => {
        const response = await irys.upload(new Uint8Array(data) as any, { tags });
        return `https://arweave.net/${response.id}`;
    }, `upload ${(file as File).name || "blob"}`);
}

/**
 * Upload JSON metadata to Arweave via Irys.
 */
export async function uploadMetadataToArweave(metadata: any, wallet: any): Promise<string> {
    const json = JSON.stringify(metadata, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const file = new File([blob], "metadata.json", { type: "application/json" });

    return uploadToArweave(file, wallet);
}

// ── Batch upload ─────────────────────────────────────────────────────────

export interface BatchUploadItem {
    /** The image file to upload */
    file: File | Blob;
    /** Metadata to upload after the image (receives the imageUri) */
    buildMetadata: (imageUri: string) => any;
}

export interface BatchUploadResult {
    tokenId: number;
    arweaveUri: string;        // metadata URI
    arweaveImageUri: string;   // image URI
}

/**
 * Upload an entire collection to Arweave in optimised batches.
 *
 * Features:
 * • Pre-funds the Irys node for the estimated total size upfront, avoiding
 *   500+ individual balance checks.
 * • Processes items in small windows (default 3 concurrent) with progress
 *   callbacks so the UI stays responsive.
 * • Retries each individual upload up to 3 times with exponential backoff.
 * • Yields to the event loop between windows so the browser stays alive.
 */
export async function uploadBatchToArweave(
    items: BatchUploadItem[],
    wallet: any,
    onProgress?: (completed: number, total: number, status: string) => void,
    concurrency = 3,
): Promise<BatchUploadResult[]> {
    if (items.length === 0) return [];

    const irys = await getWebIrys(wallet);

    // ── Pre-fund estimate ────────────────────────────────────────────────
    onProgress?.(0, items.length, "Estimating storage cost…");

    // Estimate total bytes: each item = image + ~2KB metadata JSON
    const totalBytes = items.reduce(
        (sum, item) => sum + (item.file.size || 50_000) + 2_048,
        0
    );
    const price = await irys.getPrice(totalBytes);
    const balance = await irys.getLoadedBalance();

    if (balance.lt(price)) {
        // Fund with 20% buffer for safety
        const toFund = price.minus(balance).multipliedBy(1.2);
        onProgress?.(0, items.length, "Funding Arweave node…");
        console.log(`[Irys] Pre-funding node with ${toFund.toString()} for ~${items.length} items…`);
        await withRetry(
            () => irys.fund(toFund),
            "pre-fund"
        );
    }

    // ── Upload loop ──────────────────────────────────────────────────────
    const results: BatchUploadResult[] = new Array(items.length);
    const tags = (type: string) => [
        { name: "Content-Type", value: type || "application/octet-stream" },
        { name: "App-Name", value: "The Lily Pad" },
    ];

    for (let i = 0; i < items.length; i += concurrency) {
        const window = items.slice(i, i + concurrency);

        const windowResults = await Promise.all(
            window.map(async (item, idx) => {
                const globalIdx = i + idx;

                // 1. Upload image
                const imgData = await item.file.arrayBuffer();
                const imgUri = await withRetry(async () => {
                    const res = await irys.upload(new Uint8Array(imgData) as any, {
                        tags: tags(item.file.type),
                    });
                    return `https://arweave.net/${res.id}`;
                }, `image #${globalIdx + 1}`);

                // 2. Build & upload metadata
                const metadata = item.buildMetadata(imgUri);
                const metaJson = JSON.stringify(metadata, null, 2);
                const metaData = new TextEncoder().encode(metaJson);
                const metaUri = await withRetry(async () => {
                    const res = await irys.upload(metaData as any, {
                        tags: tags("application/json"),
                    });
                    return `https://arweave.net/${res.id}`;
                }, `metadata #${globalIdx + 1}`);

                return {
                    tokenId: globalIdx,
                    arweaveUri: metaUri,
                    arweaveImageUri: imgUri,
                } satisfies BatchUploadResult;
            })
        );

        for (const r of windowResults) {
            results[r.tokenId] = r;
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

    return results;
}
