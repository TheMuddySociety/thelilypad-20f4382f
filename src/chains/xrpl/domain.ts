/**
 * XRPL Domain - Account Domain field strategy for deterministic metadata
 *
 * Provides the high-level deploy/mint wrappers used by the Launchpad hook.
 *
 * FIX: XRPL-006 — removed fake mock address fallback; now throws if client/wallet missing.
 * FIX: XRPL-009 — mintXRPLItems now uses parallel Ticket-based minting and returns real results.
 */

import { Client, Wallet } from 'xrpl';
import { XRPLCollectionParams, XRPLDeployResult, XRPLMintItem, XRPLMintResult, NFTokenFlag } from './types';
import {
    mintNFToken,
    batchMintNFTokens,
    batchMintNFTokensParallel,
    setAccountDomain as setDomain,
} from './nft';

// ── URI hex helpers ───────────────────────────────────────────────────────────

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

/** Decode a hex-encoded URI back to a string. */
export function fromHexUri(hex: string): string {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    return new TextDecoder().decode(bytes);
}

// ── High-level Launchpad operations ──────────────────────────────────────────

/**
 * Deploy an XRPL collection by setting the Account Domain field
 * and returning the issuer address + taxon for subsequent mints.
 *
 * FIX: XRPL-006 — Throws instead of returning a fake mock address when
 * client or wallet is missing. The caller (useXRPLLaunch) always provides both.
 */
export async function deployXRPLCollection(
    params: XRPLCollectionParams,
    client: Client,
    wallet: Wallet,
): Promise<XRPLDeployResult> {
    if (!client || !wallet) {
        throw new Error('XRPL client and wallet are required to deploy a collection.');
    }

    // Taxon groups NFTs from the same collection. Using a timestamp-seeded value
    // makes it unique per deploy while being deterministic within a session.
    const taxon = Math.floor(Date.now() % 1_000_000);

    if (params.baseUri) {
        // Sets Account Domain field on ledger — marketplaces use this to discover metadata
        await setDomain(client, wallet, { domain: params.baseUri });
    }

    return { address: wallet.address, taxon };
}

/**
 * Mint XRPL NFTs for a collection.
 *
 * FIX: XRPL-009 — now uses batchMintNFTokensParallel (Ticket-based) for large batches.
 * Returns the array of XRPLMintResult so callers can store real NFTokenIDs in the DB.
 *
 * @param flags    NFTokenFlag bitfield — defaults to tfTransferable (8). The generator
 *                 wizard computes this from user selections.
 * @param issuer   Optional authorized minter address. When set, this is emitted
 *                 as the NFTokenMint Issuer field.
 */
export async function mintXRPLItems(
    issuerAddress: string,
    taxon: number,
    items: XRPLMintItem[],
    client: Client,
    wallet: Wallet,
    transferFee = 0,
    flags = NFTokenFlag.Transferable,  // default: tfTransferable only
    issuer?: string,
): Promise<XRPLMintResult[]> {
    if (!client || !wallet) {
        throw new Error('XRPL client and wallet are required to mint NFTs.');
    }

    const results = await batchMintNFTokensParallel(
        client,
        wallet,
        items.map((i) => ({ uri: i.uri })),
        taxon,
        transferFee,
        flags,
        issuer,
    );

    console.log(`[XRPL] Minted ${results.length} NFTs (flags=0x${flags.toString(16)}, issuer=${issuer ?? 'none'})`);
    return results;
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
