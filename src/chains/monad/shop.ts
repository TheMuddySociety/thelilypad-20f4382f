/**
 * Monad Shop — Payment Splitter for digital goods purchases
 *
 * Handles sticker packs, emote packs, emoji packs, loot boxes
 * via a PaymentSplitter contract or direct MON transfers.
 */

import { createWalletClient, custom, parseEther, type Address } from 'viem';
import { monadTestnet } from 'viem/chains';
import { PLATFORM_WALLETS, TREASURY_CONFIG } from '@/config/treasury';

// Minimal PaymentSplitter ABI
const PAYMENT_SPLITTER_ABI = [
    {
        inputs: [
            { internalType: 'address', name: 'creator', type: 'address' },
            { internalType: 'string', name: 'itemId', type: 'string' },
            { internalType: 'string', name: 'itemType', type: 'string' },
        ],
        name: 'purchase',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
] as const;

export interface MonadShopResult {
    success: boolean;
    txHash?: string;
    error?: string;
}

export type MonadShopItemType = 'sticker_pack' | 'emote_pack' | 'emoji_pack' | 'loot_box';

/**
 * Purchase a shop item on Monad via PaymentSplitter contract.
 * The contract handles the fee split between creator and platform treasury.
 */
export async function purchaseMonadShopItem(
    splitterAddress: Address,
    creatorAddress: Address,
    itemId: string,
    itemType: MonadShopItemType,
    priceMon: string
): Promise<MonadShopResult> {
    if (typeof window === 'undefined' || !window.ethereum) {
        return { success: false, error: 'No wallet provider found' };
    }

    try {
        const walletClient = createWalletClient({
            chain: monadTestnet,
            transport: custom(window.ethereum),
        });

        const [account] = await walletClient.getAddresses();

        const hash = await walletClient.writeContract({
            account,
            address: splitterAddress,
            abi: PAYMENT_SPLITTER_ABI,
            functionName: 'purchase',
            args: [creatorAddress, itemId, itemType],
            value: parseEther(priceMon),
        });

        return { success: true, txHash: hash };
    } catch (err: any) {
        console.error(`[Monad Shop] Purchase failed:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Direct MON transfer fallback (no splitter contract required).
 * Splits payment between creator and platform treasury on the client side.
 */
export async function purchaseMonadShopDirect(
    creatorAddress: Address,
    priceMon: string,
    itemType: MonadShopItemType
): Promise<MonadShopResult> {
    if (typeof window === 'undefined' || !window.ethereum) {
        return { success: false, error: 'No wallet provider found' };
    }

    try {
        const walletClient = createWalletClient({
            chain: monadTestnet,
            transport: custom(window.ethereum),
        });

        const [account] = await walletClient.getAddresses();
        const totalWei = parseEther(priceMon);
        const { shop } = TREASURY_CONFIG.fees;
        const platformWei = (totalWei * BigInt(shop.platformFee)) / 10000n;
        const creatorWei = totalWei - platformWei;

        // Send creator share
        const hash = await walletClient.sendTransaction({
            account,
            to: creatorAddress,
            value: creatorWei,
        });

        // Send platform fee
        if (platformWei > 0n) {
            await walletClient.sendTransaction({
                account,
                to: PLATFORM_WALLETS.monad.treasury as Address,
                value: platformWei,
            });
        }

        return { success: true, txHash: hash };
    } catch (err: any) {
        console.error(`[Monad Shop] Direct purchase failed:`, err.message);
        return { success: false, error: err.message };
    }
}
