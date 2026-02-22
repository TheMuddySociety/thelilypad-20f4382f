/**
 * XRPL NFT Operations — real xrpl.js implementations
 *
 * Covers the full XLS-20 NFToken lifecycle:
 *   Mint → Offer (sell / buy) → Accept / Broker → Burn
 *
 * @see https://xrpl.org/docs/use-cases/tokenization/nft-mkt-overview
 * @see https://xrpl.org/docs/use-cases/tokenization/digital-artist
 */

import { Client, Wallet, convertStringToHex, NFTokenMint, NFTokenCreateOffer, NFTokenAcceptOffer, NFTokenBurn, AccountSet } from 'xrpl';
import type {
    XRPLMintParams,
    XRPLMintResult,
    XRPLCreateSellOfferParams,
    XRPLCreateBuyOfferParams,
    XRPLOfferResult,
    XRPLAcceptOfferParams,
    XRPLBrokerSaleParams,
    XRPLAcceptResult,
    XRPLBurnParams,
    XRPLAuthorizedMinterParams,
    XRPLSetDomainParams,
} from './types';
import { NFTokenFlag } from './types';
import { getXRPLEndpoint, type XRPLNetwork } from './client';

// ── Helpers ───────────────────────────────────────────────

/**
 * Parse the newly minted NFTokenID from transaction metadata.
 * The XRPL returns the new token ID inside `meta.nftoken_id` (xrpl.js v4+)
 * or we can diff the NFTokenPage before/after.
 */
function extractNFTokenId(meta: any): string {
    // xrpl.js v4 surfaces it directly
    if (meta?.nftoken_id) return meta.nftoken_id;

    // Fallback: scan AffectedNodes for created NFToken
    const nodes = meta?.AffectedNodes ?? [];
    for (const node of nodes) {
        const created = node.CreatedNode ?? node.ModifiedNode;
        if (!created) continue;
        const fields = created.NewFields ?? created.FinalFields;
        if (fields?.NFTokens) {
            const tokens: any[] = fields.NFTokens;
            if (tokens.length > 0) {
                const last = tokens[tokens.length - 1];
                return last?.NFToken?.NFTokenID ?? '';
            }
        }
    }
    return '';
}

/**
 * Extract newly created NFTokenOffer index from metadata.
 */
function extractOfferIndex(meta: any): string {
    if (meta?.offer_id) return meta.offer_id;

    const nodes = meta?.AffectedNodes ?? [];
    for (const node of nodes) {
        const created = node.CreatedNode;
        if (created?.LedgerEntryType === 'NFTokenOffer') {
            return created.LedgerIndex ?? '';
        }
    }
    return '';
}

// ── Core Operations ───────────────────────────────────────

/**
 * Mint a single NFToken.
 *
 * @param client  Connected xrpl.Client
 * @param wallet  Signing wallet
 * @param params  Mint configuration
 *
 * Flags cheat-sheet (combine with `|`):
 *   1 = Burnable, 8 = Transferable, 9 = both
 *
 * @see https://xrpl.org/docs/references/protocol/transactions/types/nftokenmint
 */
export async function mintNFToken(
    client: Client,
    wallet: Wallet,
    params: XRPLMintParams,
): Promise<XRPLMintResult> {
    const tx: NFTokenMint = {
        TransactionType: 'NFTokenMint',
        Account: wallet.address,
        URI: convertStringToHex(params.uri),
        Flags: params.flags ?? (NFTokenFlag.Burnable | NFTokenFlag.Transferable),
        NFTokenTaxon: params.taxon,
        TransferFee: params.transferFee ?? 0,
        ...(params.issuer ? { Issuer: params.issuer } : {}),
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    const nfTokenId = extractNFTokenId(result.result.meta);

    return {
        nfTokenId,
        txHash: typeof result.result.hash === 'string' ? result.result.hash : signed.hash,
    };
}

/**
 * Batch-mint multiple NFTokens for a collection.
 * Mints sequentially to avoid sequence-number conflicts.
 */
export async function batchMintNFTokens(
    client: Client,
    wallet: Wallet,
    items: { uri: string }[],
    taxon: number,
    transferFee = 0,
    flags = NFTokenFlag.Burnable | NFTokenFlag.Transferable,
): Promise<XRPLMintResult[]> {
    const results: XRPLMintResult[] = [];
    for (const item of items) {
        const res = await mintNFToken(client, wallet, {
            uri: item.uri,
            taxon,
            transferFee,
            flags,
        });
        results.push(res);
    }
    return results;
}

// ── Sell / Buy Offers ─────────────────────────────────────

/**
 * Create a sell offer for an NFT you own.
 * @see https://xrpl.org/docs/references/protocol/transactions/types/nftokencreateoffer
 */
export async function createSellOffer(
    client: Client,
    wallet: Wallet,
    params: XRPLCreateSellOfferParams,
): Promise<XRPLOfferResult> {
    const tx: NFTokenCreateOffer = {
        TransactionType: 'NFTokenCreateOffer',
        Account: wallet.address,
        NFTokenID: params.nfTokenId,
        Amount: params.amount,
        Flags: 1, // tfSellNFToken
        ...(params.destination ? { Destination: params.destination } : {}),
        ...(params.expiration ? { Expiration: params.expiration } : {}),
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    return {
        offerIndex: extractOfferIndex(result.result.meta),
        txHash: typeof result.result.hash === 'string' ? result.result.hash : signed.hash,
    };
}

/**
 * Create a buy offer for an NFT you do NOT own.
 */
export async function createBuyOffer(
    client: Client,
    wallet: Wallet,
    params: XRPLCreateBuyOfferParams,
): Promise<XRPLOfferResult> {
    const tx: NFTokenCreateOffer = {
        TransactionType: 'NFTokenCreateOffer',
        Account: wallet.address,
        NFTokenID: params.nfTokenId,
        Amount: params.amount,
        Owner: params.owner,
        Flags: 0, // buy offer (no tfSellNFToken)
        ...(params.expiration ? { Expiration: params.expiration } : {}),
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    return {
        offerIndex: extractOfferIndex(result.result.meta),
        txHash: typeof result.result.hash === 'string' ? result.result.hash : signed.hash,
    };
}

// ── Accept / Broker ───────────────────────────────────────

/**
 * Accept a single sell or buy offer (direct mode).
 * @see https://xrpl.org/docs/references/protocol/transactions/types/nftokenacceptoffer
 */
export async function acceptOffer(
    client: Client,
    wallet: Wallet,
    params: XRPLAcceptOfferParams,
): Promise<XRPLAcceptResult> {
    const tx: NFTokenAcceptOffer = {
        TransactionType: 'NFTokenAcceptOffer',
        Account: wallet.address,
        ...(params.sellOfferIndex ? { NFTokenSellOffer: params.sellOfferIndex } : {}),
        ...(params.buyOfferIndex ? { NFTokenBuyOffer: params.buyOfferIndex } : {}),
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    return {
        txHash: typeof result.result.hash === 'string' ? result.result.hash : signed.hash,
    };
}

/**
 * Broker a sale by matching a sell offer with a buy offer (brokered mode).
 * The broker earns a fee from the spread between sell and buy amounts.
 * @see https://xrpl.org/docs/tutorials/javascript/nfts/broker-an-nft-sale
 */
export async function brokerSale(
    client: Client,
    wallet: Wallet,
    params: XRPLBrokerSaleParams,
): Promise<XRPLAcceptResult> {
    const tx: NFTokenAcceptOffer = {
        TransactionType: 'NFTokenAcceptOffer',
        Account: wallet.address,
        NFTokenSellOffer: params.sellOfferIndex,
        NFTokenBuyOffer: params.buyOfferIndex,
        ...(params.brokerFee ? { NFTokenBrokerFee: params.brokerFee } : {}),
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    return {
        txHash: typeof result.result.hash === 'string' ? result.result.hash : signed.hash,
    };
}

// ── Cancel Offers ─────────────────────────────────────────

/**
 * Cancel one or more NFTokenOffers that you created.
 */
export async function cancelOffers(
    client: Client,
    wallet: Wallet,
    offerIndexes: string[],
): Promise<XRPLAcceptResult> {
    const tx = {
        TransactionType: 'NFTokenCancelOffer' as const,
        Account: wallet.address,
        NFTokenOffers: offerIndexes,
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    return {
        txHash: typeof result.result.hash === 'string' ? result.result.hash : signed.hash,
    };
}

// ── Burn ──────────────────────────────────────────────────

/**
 * Burn an NFToken. Only works if you own it, or if the issuer
 * minted with the lsfBurnable flag.
 */
export async function burnNFToken(
    client: Client,
    wallet: Wallet,
    params: XRPLBurnParams,
): Promise<XRPLAcceptResult> {
    const tx: NFTokenBurn = {
        TransactionType: 'NFTokenBurn',
        Account: wallet.address,
        NFTokenID: params.nfTokenId,
        ...(params.owner ? { Owner: params.owner } : {}),
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    return {
        txHash: typeof result.result.hash === 'string' ? result.result.hash : signed.hash,
    };
}

// ── Authorized Minter ─────────────────────────────────────

/**
 * Set or revoke an authorized minter via AccountSet.
 * Pass `minterAddress: ''` to revoke.
 * @see https://xrpl.org/docs/use-cases/tokenization/authorized-minter
 */
export async function setAuthorizedMinter(
    client: Client,
    wallet: Wallet,
    params: XRPLAuthorizedMinterParams,
): Promise<XRPLAcceptResult> {
    const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: wallet.address,
        ...(params.minterAddress
            ? { NFTokenMinter: params.minterAddress }
            : { ClearFlag: 10 }), // asfAuthorizedNFTokenMinter = 10
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    return {
        txHash: typeof result.result.hash === 'string' ? result.result.hash : signed.hash,
    };
}

// ── Account Domain ────────────────────────────────────────

/**
 * Set the Account Domain field for deterministic metadata resolution.
 */
export async function setAccountDomain(
    client: Client,
    wallet: Wallet,
    params: XRPLSetDomainParams,
): Promise<XRPLAcceptResult> {
    const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: wallet.address,
        Domain: convertStringToHex(params.domain),
    };

    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    return {
        txHash: typeof result.result.hash === 'string' ? result.result.hash : signed.hash,
    };
}

// ── Query Helpers ─────────────────────────────────────────

/**
 * Get all NFTs owned by an account.
 */
export async function getAccountNFTs(
    client: Client,
    account: string,
): Promise<any[]> {
    const response = await client.request({
        command: 'account_nfts',
        account,
    });
    return (response.result as any).account_nfts ?? [];
}

/**
 * Get sell offers for a specific NFToken.
 */
export async function getNFTSellOffers(
    client: Client,
    nfTokenId: string,
): Promise<any[]> {
    try {
        const response = await client.request({
            command: 'nft_sell_offers',
            nft_id: nfTokenId,
        });
        return (response.result as any).offers ?? [];
    } catch {
        return []; // No offers exist
    }
}

/**
 * Get buy offers for a specific NFToken.
 */
export async function getNFTBuyOffers(
    client: Client,
    nfTokenId: string,
): Promise<any[]> {
    try {
        const response = await client.request({
            command: 'nft_buy_offers',
            nft_id: nfTokenId,
        });
        return (response.result as any).offers ?? [];
    } catch {
        return []; // No offers exist
    }
}
