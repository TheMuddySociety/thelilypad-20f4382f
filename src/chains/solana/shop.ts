/**
 * Solana Shop Transactions — Sticker Packs, Emote Packs, Emoji Packs, Loot Boxes
 *
 * All purchases use direct SOL transfer with fee splitting and protocol memos.
 */

import {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { createProtocolMemoInstruction, type ProtocolAction } from '@/lib/solanaProtocol';
import { PLATFORM_WALLETS, TREASURY_CONFIG } from '@/config/treasury';
import { solToLamports } from '@/lib/fees';

const TREASURY = new PublicKey(PLATFORM_WALLETS.solana.treasury);

export interface ShopPurchaseResult {
    success: boolean;
    txSignature?: string;
    error?: string;
}

/**
 * Build a shop purchase transaction with fee split and protocol memo.
 *
 * @param buyer         Buyer public key
 * @param creatorWallet Creator's SOL address
 * @param priceSol      Total price in SOL
 * @param action        Protocol action tag
 * @param itemId        Item ID for memo metadata
 */
export function buildShopPurchaseTx(
    buyer: PublicKey,
    creatorWallet: string,
    priceSol: number,
    action: ProtocolAction,
    itemId: string
): Transaction {
    const totalLamports = Number(solToLamports(priceSol));
    const { shop } = TREASURY_CONFIG.fees;

    const platformLamports = Math.floor((totalLamports * shop.platformFee) / 10000);
    const creatorLamports = totalLamports - platformLamports;

    const tx = new Transaction();

    // Creator payment
    if (creatorLamports > 0) {
        tx.add(
            SystemProgram.transfer({
                fromPubkey: buyer,
                toPubkey: new PublicKey(creatorWallet),
                lamports: creatorLamports,
            })
        );
    }

    // Platform fee
    if (platformLamports > 0) {
        tx.add(
            SystemProgram.transfer({
                fromPubkey: buyer,
                toPubkey: TREASURY,
                lamports: platformLamports,
            })
        );
    }

    // Protocol memo
    tx.add(createProtocolMemoInstruction(action, { id: itemId, price: priceSol.toString() }));

    return tx;
}

/** Purchase a sticker pack */
export function buildStickerPackPurchaseTx(buyer: PublicKey, creatorWallet: string, priceSol: number, packId: string) {
    return buildShopPurchaseTx(buyer, creatorWallet, priceSol, 'shop:sticker_pack', packId);
}

/** Purchase an emote pack */
export function buildEmotePackPurchaseTx(buyer: PublicKey, creatorWallet: string, priceSol: number, packId: string) {
    return buildShopPurchaseTx(buyer, creatorWallet, priceSol, 'shop:emote_pack', packId);
}

/** Purchase an emoji pack */
export function buildEmojiPackPurchaseTx(buyer: PublicKey, creatorWallet: string, priceSol: number, packId: string) {
    return buildShopPurchaseTx(buyer, creatorWallet, priceSol, 'shop:emoji_pack', packId);
}

/** Purchase a loot box / blind box */
export function buildLootBoxPurchaseTx(buyer: PublicKey, creatorWallet: string, priceSol: number, boxId: string) {
    return buildShopPurchaseTx(buyer, creatorWallet, priceSol, 'shop:blind_box', boxId);
}
