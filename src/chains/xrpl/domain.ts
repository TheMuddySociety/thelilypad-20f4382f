/**
 * XRPL Domain - Account Domain field strategy for deterministic metadata
 */

import { XRPLCollectionParams, XRPLDeployResult, XRPLMintItem } from './types';

/**
 * Set Account Domain field for deterministic metadata resolution
 */
export async function setAccountDomain(
    account: string,
    baseUri: string
): Promise<void> {
    // TODO: Implement AccountSet transaction with Domain field
    // This will use xrpl.js to submit an AccountSet transaction
    console.log(`[XRPL] Setting Account Domain for ${account} to ${baseUri}`);
}

/**
 * Deploy XRPL collection with Domain strategy
 */
export async function deployXRPLCollection(
    params: XRPLCollectionParams
): Promise<XRPLDeployResult> {
    // TODO: Implement actual XRPL deployment logic
    // 1. Submit AccountSet with Domain field set to baseUri
    // 2. Return issuer address and taxon

    console.log("[XRPL] Deploying collection:", params.name);
    console.log("[XRPL] Base URI:", params.baseUri);

    // Placeholder response
    const mockIssuerAddress = 'rLilyPad' + Math.random().toString(36).substring(7);
    const mockTaxon = Math.floor(Math.random() * 1000000);

    return {
        address: mockIssuerAddress,
        taxon: mockTaxon,
    };
}

/**
 * Mint XRPL NFTs
 */
export async function mintXRPLItems(
    issuerAddress: string,
    taxon: number,
    items: XRPLMintItem[]
): Promise<boolean> {
    // TODO: Implement NFTokenMint transactions
    console.log(`[XRPL] Minting ${items.length} NFTs for taxon ${taxon}`);

    return true;
}

/**
 * Resolve Account Domain to get metadata base URI
 */
export async function resolveAccountDomain(account: string): Promise<string | null> {
    // TODO: Fetch account info and decode Domain field
    console.log(`[XRPL] Resolving Domain for account ${account}`);

    return null;
}

/**
 * Convert a URI string to hex encoding for XRPL URI field.
 * XRPL requires URIs to be hex-encoded and ≤256 bytes.
 */
export function toHexUri(uri: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(uri);
    if (bytes.length > 256) {
        throw new Error(`URI exceeds XRPL 256-byte limit (${bytes.length} bytes): ${uri}`);
    }
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

/**
 * Decode a hex-encoded URI back to a string.
 */
export function fromHexUri(hex: string): string {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    return new TextDecoder().decode(bytes);
}
