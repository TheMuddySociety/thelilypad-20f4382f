/**
 * Solana Creator / Streamer On-Chain Operations
 *
 * - tipCreator: direct SOL transfer (0% platform fee)
 * - registerCreatorOnChain: memo-tagged identity registration
 */

import {
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { createProtocolMemoInstruction } from '@/lib/solanaProtocol';
import { solToLamports } from '@/lib/fees';

/**
 * Build a tip transaction — 100% goes to the creator, no platform fee.
 */
export function buildTipCreatorTx(
    tipper: PublicKey,
    creatorWallet: string,
    amountSol: number,
    message?: string
): Transaction {
    const lamports = Number(solToLamports(amountSol));
    const tx = new Transaction();

    tx.add(
        SystemProgram.transfer({
            fromPubkey: tipper,
            toPubkey: new PublicKey(creatorWallet),
            lamports,
        })
    );

    const meta: Record<string, string> = { amount: amountSol.toString() };
    if (message) meta.msg = message.slice(0, 64);

    tx.add(createProtocolMemoInstruction('tip:creator', meta));

    return tx;
}

/**
 * Build a creator registration memo transaction.
 * Records the creator's identity on-chain for verification.
 */
export function buildCreatorRegistrationTx(
    creator: PublicKey,
    displayName: string,
    metadata?: Record<string, string>
): Transaction {
    const tx = new Transaction();

    tx.add(
        createProtocolMemoInstruction('creator:register', {
            name: displayName.slice(0, 32),
            wallet: creator.toBase58(),
            ...metadata,
        })
    );

    return tx;
}
