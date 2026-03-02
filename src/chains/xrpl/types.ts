/**
 * XRPL Types - Type definitions for XRPL chain operations
 * Based on XLS-20 NFToken standard
 * @see https://xrpl.org/docs/use-cases/tokenization/nft-mkt-overview
 */

// ── Collection / Launchpad Types ──────────────────────────

export interface XRPLCollectionParams {
    name: string;
    symbol: string;
    description: string;
    totalSupply: number;
    baseUri?: string;
    royaltyPercent?: number;
    /** Transfer fee 0-50000 (0.000% – 50.000%) */
    transferFee?: number;
    /**
     * Bitfield of NFTokenFlag values to apply to every minted token.
     * Default: tfTransferable (8).
     */
    flags?: number;
    /**
     * Optional authorized minter — when set, the Issuer field is
     * populated in every NFTokenMint transaction.
     */
    authorizedMinter?: string;
    /** Token taxon used to group NFTs into a collection. */
    taxon?: number;
}

export interface XRPLDeployResult {
    /** Issuer address */
    address: string;
    /** Token taxon used to group NFTs into a collection */
    taxon: number;
}

export interface XRPLMintItem {
    name: string;
    uri: string;
}

// ── NFToken Flags (bitfield) ──────────────────────────────

export enum NFTokenFlag {
    /** Issuer can burn the token regardless of owner */
    Burnable = 1,
    /** Only XRP can be used to buy/sell — recommended when transfer fee is set */
    OnlyXRP = 2,
    /** NFT can be transferred to third parties */
    Transferable = 8,
    /** URI field can be updated via NFTokenModify after mint */
    Mutable = 16,
}

// ── Mint Params ───────────────────────────────────────────

export interface XRPLMintParams {
    /** URI pointing to NFT metadata (will be hex-encoded, max 256 bytes) */
    uri: string;
    /**
     * Taxon for grouping NFTs into a collection.
     * Use the same taxon across a collection.
     */
    taxon: number;
    /**
     * Transfer fee 0-50000 representing 0.000%–50.000%.
     * @default 0
     */
    transferFee?: number;
    /**
     * Combination of NFTokenFlag values.
     * Use `NFTokenFlag.Burnable | NFTokenFlag.Transferable` (= 9) for typical NFTs.
     * @default 9 (burnable + transferable)
     */
    flags?: number;
    /**
     * If minting on behalf of another account (authorized minter),
     * set this to the issuer's address.
     */
    issuer?: string;
    /**
     * For parallel minting with XRPL Tickets.
     * When set, Sequence is forced to 0 and this Ticket is consumed.
     * @see batchMintNFTokensParallel in nft.ts
     */
    ticketSequence?: number;
}

export interface XRPLMintResult {
    /** The newly minted NFTokenID */
    nfTokenId: string;
    /** Transaction hash */
    txHash: string;
}

// ── Offer Types ───────────────────────────────────────────

export interface XRPLCreateSellOfferParams {
    /** The NFTokenID to sell */
    nfTokenId: string;
    /** Price in drops (1 XRP = 1,000,000 drops) */
    amount: string;
    /** Optional: restrict the offer to a specific buyer */
    destination?: string;
    /** Optional: offer expiration (Unix seconds) */
    expiration?: number;
}

export interface XRPLCreateBuyOfferParams {
    /** The NFTokenID to buy */
    nfTokenId: string;
    /** Price in drops */
    amount: string;
    /** The current owner of the NFT */
    owner: string;
    /** Optional: offer expiration (Unix seconds) */
    expiration?: number;
}

export interface XRPLOfferResult {
    /** Created NFTokenOffer index (on-ledger object ID) */
    offerIndex: string;
    /** Transaction hash */
    txHash: string;
}

export interface XRPLAcceptOfferParams {
    /** Sell offer index to accept (direct sale) */
    sellOfferIndex?: string;
    /** Buy offer index to accept (direct buy) */
    buyOfferIndex?: string;
}

export interface XRPLBrokerSaleParams {
    /** Sell offer index */
    sellOfferIndex: string;
    /** Buy offer index */
    buyOfferIndex: string;
    /** Broker fee in drops */
    brokerFee?: string;
}

export interface XRPLAcceptResult {
    txHash: string;
}

// ── Burn ──────────────────────────────────────────────────

export interface XRPLBurnParams {
    /** NFTokenID to burn */
    nfTokenId: string;
    /**
     * If the issuer is burning a token owned by another account
     * (requires lsfBurnable flag), specify the owner here.
     */
    owner?: string;
}

// ── Authorized Minter ─────────────────────────────────────

export interface XRPLAuthorizedMinterParams {
    /** Address to authorize as a minter, or empty string to revoke */
    minterAddress: string;
}

// ── Account Domain ────────────────────────────────────────

export interface XRPLSetDomainParams {
    /** Domain/URI to set on account (will be hex-encoded) */
    domain: string;
}
