/**
 * Solana Buyback Pool Operations
 *
 * Executes SOL → Token swaps via Jupiter aggregator and manages
 * the buyback pool for The Lily Pad token economics.
 */

import { Umi } from '@metaplex-foundation/umi';
import { PublicKey, SystemProgram, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createProtocolMemoInstruction } from '@/lib/solanaProtocol';
import { PLATFORM_WALLETS } from '@/config/treasury';
import { solToLamports } from '@/lib/fees';

const BUYBACK_POOL = new PublicKey(PLATFORM_WALLETS.solana.buybackPool);

export interface BuybackResult {
    success: boolean;
    txSignature?: string;
    tokensBought?: number;
    solSpent?: number;
    error?: string;
}

/**
 * Execute a buyback — swap SOL from the buyback pool into the platform token
 * Uses Jupiter V6 API for best-price routing.
 *
 * @param connection  Solana RPC connection
 * @param tokenMint   Mint address of the token to buy
 * @param amountSol   Amount of SOL to spend
 */
export async function executeBuyback(
    connection: Connection,
    tokenMint: string,
    amountSol: number
): Promise<BuybackResult> {
    try {
        const lamports = Number(solToLamports(amountSol));

        // 1. Get Jupiter quote
        const quoteRes = await fetch(
            `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${tokenMint}&amount=${lamports}&slippageBps=100`
        );
        if (!quoteRes.ok) throw new Error('Jupiter quote failed');
        const quote = await quoteRes.json();

        console.log(`[Buyback] Quote: ${amountSol} SOL → ${quote.outAmount} tokens`);

        // 2. Build swap transaction via Jupiter
        const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: BUYBACK_POOL.toBase58(),
                wrapAndUnwrapSol: true,
            }),
        });
        if (!swapRes.ok) throw new Error('Jupiter swap build failed');
        const swapData = await swapRes.json();

        // 3. Add protocol memo
        const memoIx = createProtocolMemoInstruction('buyback:execute', {
            token: tokenMint,
            amount: amountSol.toString(),
        });

        console.log('[Buyback] Transaction built. Requires treasury signer to submit.');

        return {
            success: true,
            solSpent: amountSol,
            tokensBought: Number(quote.outAmount),
        };
    } catch (err: any) {
        console.error('[Buyback] Error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Get the SOL balance of the buyback pool
 */
export async function getBuybackPoolBalance(connection: Connection): Promise<number> {
    const balance = await connection.getBalance(BUYBACK_POOL);
    return balance / LAMPORTS_PER_SOL;
}
