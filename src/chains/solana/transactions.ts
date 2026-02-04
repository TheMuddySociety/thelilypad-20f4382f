import { Umi, transactionBuilder } from '@metaplex-foundation/umi';

/**
 * Solana Transactions - Transaction building and confirmation utilities
 */

/**
 * Wait for transaction confirmation
 */
export async function waitForConfirmation(
    umi: Umi,
    signature: Uint8Array,
    maxRetries = 10
): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await umi.rpc.getSignatureStatuses([signature]);
            if (result[0]?.confirmationStatus === 'confirmed' || result[0]?.confirmationStatus === 'finalized') {
                return true;
            }
        } catch (e) {
            // Silent retry
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
}

/**
 * Build and send a transaction with retry logic
 */
export async function buildAndSendTransaction(
    umi: Umi,
    instructions: any[],
    options?: {
        skipPreflight?: boolean;
        maxRetries?: number;
    }
): Promise<Uint8Array> {
    const opts = {
        skipPreflight: false,
        maxRetries: 3,
        ...options,
    };

    let attempts = 0;

    while (attempts < opts.maxRetries) {
        try {
            await umi.rpc.getLatestBlockhash();

            let builder = transactionBuilder();
            for (const ix of instructions) {
                builder = builder.add(ix);
            }

            const signature = await builder.sendAndConfirm(umi, {
                send: { skipPreflight: opts.skipPreflight },
                confirm: { commitment: 'confirmed' }
            });

            return signature;
        } catch (err: any) {
            attempts++;
            console.warn(`Transaction attempt ${attempts} failed:`, err.message);

            if (attempts >= opts.maxRetries) throw err;

            if (err.message?.includes("Blockhash not found") || err.message?.includes("blockhash")) {
                console.log("Retrying with fresh blockhash...");
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
            throw err;
        }
    }

    throw new Error("Transaction failed after max retries");
}
