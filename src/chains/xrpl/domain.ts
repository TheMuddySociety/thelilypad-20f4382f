/**
 * XRPL Domain - Account Domain field strategy for deterministic metadata
 *
 * Also provides the high-level deploy/mint wrappers used by the Launchpad hook.
 */

import { Client, Wallet, convertStringToHex } from 'xrpl';
import { XRPLCollectionParams, XRPLDeployResult, XRPLMintItem, NFTokenFlag } from './types';
import { getXRPLEndpoint, type XRPLNetwork } from './client';
import { mintNFToken, batchMintNFTokens, setAccountDomain as setDomain } from './nft';

// ── URI hex helpers ───────────────────────────────────────

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

// ── High-level Launchpad operations ───────────────────────

/**
 * Deploy an XRPL collection by setting the Account Domain field
 * and returning the issuer address + taxon for subsequent mints.
 */
export async function deployXRPLCollection(
    params: XRPLCollectionParams,
    client?: Client,
    wallet?: Wallet,
): Promise<XRPLDeployResult> {
    const taxon = Math.floor(Math.random() * 1000000);

    // If we have a live client + wallet, submit the AccountSet tx
    if (client && wallet) {
        if (params.baseUri) {
            await setDomain(client, wallet, { domain: params.baseUri });
        }
        return { address: wallet.address, taxon };
    }

    // Fallback: placeholder for wallet-less preview / testing
    console.log('[XRPL] Deploying collection:', params.name);
    console.log('[XRPL] Base URI:', params.baseUri);
    const mockIssuerAddress = 'rLilyPad' + Math.random().toString(36).substring(7);
    return { address: mockIssuerAddress, taxon };
}

/**
 * Mint XRPL NFTs for a collection.
 */
export async function mintXRPLItems(
    issuerAddress: string,
    taxon: number,
    items: XRPLMintItem[],
    client?: Client,
    wallet?: Wallet,
    transferFee = 0,
): Promise<boolean> {
    if (client && wallet) {
        const results = await batchMintNFTokens(
            client,
            wallet,
            items.map((i) => ({ uri: i.uri })),
            taxon,
            transferFee,
            NFTokenFlag.Burnable | NFTokenFlag.Transferable,
        );
        console.log(`[XRPL] Minted ${results.length} NFTs`);
        return true;
    }

    // Fallback placeholder
    console.log(`[XRPL] Minting ${items.length} NFTs for taxon ${taxon}`);
    return true;
}

/**
 * Resolve Account Domain to get metadata base URI.
 */
export async function resolveAccountDomain(
    account: string,
    client?: Client,
): Promise<string | null> {
    if (client) {
        try {
            const response = await client.request({
                command: 'account_info',
                account,
            });
            const domain = (response.result as any).account_data?.Domain;
            if (domain) return fromHexUri(domain);
        } catch (err) {
            console.error('[XRPL] Failed to resolve domain:', err);
        }
    }
    return null;
}
