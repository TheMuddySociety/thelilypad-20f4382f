/**
 * IPFS Gateway Configuration & Utilities
 *
 * Uses Cloudflare's IPFS gateway as the primary resolver.
 * @see https://developers.cloudflare.com/web3/ipfs-gateway/
 *
 * Cloudflare's gateway is:
 *   • Free — no API key required for reads
 *   • Fast — backed by Cloudflare's edge network (300+ PoPs)
 *   • Reliable — automatic retries & DHT crawling
 *
 * For **uploading** (pinning) content to IPFS, use any pinning service
 * (e.g. `ipfs add`, web3.storage, Filebase) — the gateway only handles reads.
 */

// ── Gateway URLs ──────────────────────────────────────────────────────────────

/** Primary IPFS gateway (Cloudflare) */
export const IPFS_GATEWAY = "https://cloudflare-ipfs.com";

/** Fallback gateways (used if Cloudflare is unavailable) */
export const IPFS_FALLBACK_GATEWAYS = [
    "https://dweb.link",
    "https://ipfs.io",
    "https://w3s.link",
] as const;

// ── Converters ────────────────────────────────────────────────────────────────

/**
 * Convert an `ipfs://` URI to an HTTP gateway URL.
 *
 * @example
 *   ipfsToHttp("ipfs://QmXoypiz...")
 *   // => "https://cloudflare-ipfs.com/ipfs/QmXoypiz..."
 *
 *   ipfsToHttp("ipfs://bafybeif.../0.png")
 *   // => "https://cloudflare-ipfs.com/ipfs/bafybeif.../0.png"
 *
 *   ipfsToHttp("https://example.com/image.png")
 *   // => "https://example.com/image.png"  (passthrough)
 */
export function ipfsToHttp(uri: string | null | undefined, gateway = IPFS_GATEWAY): string {
    if (!uri) return "";

    // Already an HTTP URL — pass through
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
        // Rewrite known legacy gateways to Cloudflare if desired
        return rewriteGateway(uri, gateway);
    }

    // ipfs:// protocol
    if (uri.startsWith("ipfs://")) {
        const path = uri.slice("ipfs://".length);
        return `${gateway}/ipfs/${path}`;
    }

    // Bare CID (Qm... or bafy...)
    if (uri.startsWith("Qm") || uri.startsWith("bafy")) {
        return `${gateway}/ipfs/${uri}`;
    }

    return uri;
}

/**
 * Convert an HTTP gateway URL back to the canonical `ipfs://` URI.
 *
 * @example
 *   httpToIpfs("https://cloudflare-ipfs.com/ipfs/QmXyz.../file.png")
 *   // => "ipfs://QmXyz.../file.png"
 */
export function httpToIpfs(url: string): string {
    if (!url) return "";
    const match = url.match(/\/ipfs\/(.+)$/);
    if (match) return `ipfs://${match[1]}`;
    return url;
}

// ── Internal ──────────────────────────────────────────────────────────────────

/** Rewrite old gateway URLs (Pinata, ipfs.io, etc.) to the preferred gateway */
function rewriteGateway(url: string, preferredGateway: string): string {
    const legacyPatterns = [
        /https?:\/\/gateway\.pinata\.cloud\/ipfs\//,
        /https?:\/\/[^/]+\.mypinata\.cloud\/ipfs\//,
        /https?:\/\/ipfs\.io\/ipfs\//,
        /https?:\/\/dweb\.link\/ipfs\//,
        /https?:\/\/w3s\.link\/ipfs\//,
        /https?:\/\/nftstorage\.link\/ipfs\//,
    ];

    for (const pattern of legacyPatterns) {
        if (pattern.test(url)) {
            return url.replace(pattern, `${preferredGateway}/ipfs/`);
        }
    }

    return url;
}

/**
 * Build a full IPFS directory URL for a collection.
 *
 * @example
 *   buildCollectionImageUrl("bafybeif...", 42)
 *   // => "https://cloudflare-ipfs.com/ipfs/bafybeif.../42.png"
 */
export function buildCollectionImageUrl(cid: string, tokenId: number, ext = "png"): string {
    return `${IPFS_GATEWAY}/ipfs/${cid}/${tokenId}.${ext}`;
}

/**
 * Build a metadata URL for a token.
 *
 * @example
 *   buildCollectionMetadataUrl("bafybeif...", 42)
 *   // => "https://cloudflare-ipfs.com/ipfs/bafybeif.../42.json"
 */
export function buildCollectionMetadataUrl(cid: string, tokenId: number): string {
    return `${IPFS_GATEWAY}/ipfs/${cid}/${tokenId}.json`;
}
