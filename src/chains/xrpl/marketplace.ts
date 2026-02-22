/**
 * XRPL Marketplace — Higher-level marketplace operations
 *
 * Composes the low-level nft.ts primitives into marketplace workflows:
 *   • List for sale  (mint → sell offer)
 *   • Buy now        (accept sell offer)
 *   • Make offer     (create buy offer)
 *   • Accept offer   (accept buy offer)
 *   • Broker sale    (match sell + buy offers, earn broker fee)
 *   • Cancel listing (cancel sell offer)
 *
 * @see https://xrpl.org/docs/use-cases/tokenization/nftoken-marketplace
 */

import { Client, Wallet } from 'xrpl';
import {
    createSellOffer,
    createBuyOffer,
    acceptOffer,
    brokerSale,
    cancelOffers,
    getNFTSellOffers,
    getNFTBuyOffers,
} from './nft';

// ── Types ─────────────────────────────────────────────────

export interface XRPLListingParams {
    /** NFTokenID to list */
    nfTokenId: string;
    /** Price in drops */
    priceDrops: string;
    /** Optional: restrict to a specific buyer */
    destination?: string;
    /** Optional: offer expiration (Unix seconds) */
    expiration?: number;
}

export interface XRPLListingResult {
    offerIndex: string;
    txHash: string;
}

export interface XRPLBuyNowParams {
    /** The sell offer index to accept */
    sellOfferIndex: string;
}

export interface XRPLMakeOfferParams {
    /** NFTokenID */
    nfTokenId: string;
    /** Offer amount in drops */
    amountDrops: string;
    /** Current owner of the NFT */
    ownerAddress: string;
    /** Optional expiration */
    expiration?: number;
}

export interface XRPLBrokerParams {
    sellOfferIndex: string;
    buyOfferIndex: string;
    /** Broker fee in drops */
    brokerFeeDrops?: string;
}

// ── Marketplace Operations ────────────────────────────────

/**
 * List an NFT for sale by creating a sell offer.
 * The NFT stays in the owner's account until accepted (no escrow needed on XRPL).
 */
export async function listNFTForSale(
    client: Client,
    wallet: Wallet,
    params: XRPLListingParams,
): Promise<XRPLListingResult> {
    const result = await createSellOffer(client, wallet, {
        nfTokenId: params.nfTokenId,
        amount: params.priceDrops,
        destination: params.destination,
        expiration: params.expiration,
    });
    return {
        offerIndex: result.offerIndex,
        txHash: result.txHash,
    };
}

/**
 * Buy an NFT immediately by accepting an existing sell offer.
 */
export async function buyNFTNow(
    client: Client,
    wallet: Wallet,
    params: XRPLBuyNowParams,
): Promise<{ txHash: string }> {
    return acceptOffer(client, wallet, {
        sellOfferIndex: params.sellOfferIndex,
    });
}

/**
 * Make a buy offer on an NFT (the owner can accept later).
 */
export async function makeOffer(
    client: Client,
    wallet: Wallet,
    params: XRPLMakeOfferParams,
): Promise<XRPLListingResult> {
    const result = await createBuyOffer(client, wallet, {
        nfTokenId: params.nfTokenId,
        amount: params.amountDrops,
        owner: params.ownerAddress,
        expiration: params.expiration,
    });
    return {
        offerIndex: result.offerIndex,
        txHash: result.txHash,
    };
}

/**
 * Accept a buy offer on an NFT you own.
 */
export async function acceptBuyOffer(
    client: Client,
    wallet: Wallet,
    buyOfferIndex: string,
): Promise<{ txHash: string }> {
    return acceptOffer(client, wallet, {
        buyOfferIndex,
    });
}

/**
 * Broker a sale between a sell offer and buy offer.
 * The broker earns a fee from the spread.
 *
 * @see https://xrpl.org/docs/tutorials/javascript/nfts/broker-an-nft-sale
 */
export async function brokerNFTSale(
    client: Client,
    wallet: Wallet,
    params: XRPLBrokerParams,
): Promise<{ txHash: string }> {
    return brokerSale(client, wallet, {
        sellOfferIndex: params.sellOfferIndex,
        buyOfferIndex: params.buyOfferIndex,
        brokerFee: params.brokerFeeDrops,
    });
}

/**
 * Cancel a listing (sell offer).
 */
export async function cancelListing(
    client: Client,
    wallet: Wallet,
    offerIndex: string,
): Promise<{ txHash: string }> {
    return cancelOffers(client, wallet, [offerIndex]);
}

/**
 * Get all active sell offers for a given NFT.
 * Useful for displaying marketplace listings.
 */
export async function getListings(
    client: Client,
    nfTokenId: string,
) {
    return getNFTSellOffers(client, nfTokenId);
}

/**
 * Get all active buy offers for a given NFT.
 * Useful for displaying bids / offers on marketplace.
 */
export async function getOffers(
    client: Client,
    nfTokenId: string,
) {
    return getNFTBuyOffers(client, nfTokenId);
}
