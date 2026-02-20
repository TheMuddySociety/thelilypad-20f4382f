/**
 * SPL Token Creation Utility
 *
 * Wraps @metaplex-foundation/mpl-toolbox + @solana/spl-token to create
 * fungible tokens with metadata, suitable for use with MPL-Hybrid escrows.
 */

import {
    createFungible,
    mintV1,
    TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import {
    generateSigner,
    percentAmount,
    publicKey as toPublicKey,
    type Umi,
    type KeypairSigner,
} from '@metaplex-foundation/umi';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SplTokenConfig {
    /** Token display name */
    name: string;
    /** Token ticker symbol (e.g. "LILY") */
    symbol: string;
    /** Metadata URI (Arweave/IPFS) — can be empty string */
    uri: string;
    /** Decimal places (default 6) */
    decimals?: number;
    /** Initial supply to mint (human-readable, e.g. 1_000_000) */
    initialSupply?: number;
    /** Seller fee basis points — usually 0 for fungible tokens */
    sellerFeeBasisPoints?: number;
}

export interface SplTokenResult {
    /** The mint public key (token address) */
    mint: string;
    /** Transaction signature */
    signature: string;
    /** The keypair signer used (for future minting if needed) */
    mintSigner: KeypairSigner;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function addDecimals(amount: number, decimals: number): bigint {
    return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

// ── Create Token ───────────────────────────────────────────────────────────────

/**
 * Creates a new SPL fungible token with on-chain metadata.
 * Optionally mints an initial supply to the creator's wallet.
 */
export async function createSplToken(
    umi: Umi,
    config: SplTokenConfig
): Promise<SplTokenResult> {
    const decimals = config.decimals ?? 6;
    const sellerFee = config.sellerFeeBasisPoints ?? 0;
    const mintSigner = generateSigner(umi);

    // 1. Create the fungible token with metadata
    const createTx = await createFungible(umi, {
        mint: mintSigner,
        name: config.name,
        symbol: config.symbol,
        uri: config.uri || '',
        decimals,
        sellerFeeBasisPoints: percentAmount(sellerFee / 100),
    }).sendAndConfirm(umi);

    let lastSignature = createTx.signature;

    // 2. Mint initial supply if requested
    if (config.initialSupply && config.initialSupply > 0) {
        const mintTx = await mintV1(umi, {
            mint: mintSigner.publicKey,
            amount: addDecimals(config.initialSupply, decimals),
            tokenOwner: umi.identity.publicKey,
            tokenStandard: TokenStandard.Fungible,
        }).sendAndConfirm(umi);

        lastSignature = mintTx.signature;
    }

    return {
        mint: mintSigner.publicKey.toString(),
        signature: Buffer.from(lastSignature).toString('base64').slice(0, 44),
        mintSigner,
    };
}

// ── Mint Additional Supply ─────────────────────────────────────────────────────

/**
 * Mint additional tokens to the connected wallet.
 * Requires that the connected wallet is the mint authority.
 */
export async function mintSplTokens(
    umi: Umi,
    params: { mint: string; amount: number; decimals?: number }
): Promise<{ signature: string }> {
    const decimals = params.decimals ?? 6;

    const tx = await mintV1(umi, {
        mint: toPublicKey(params.mint),
        amount: addDecimals(params.amount, decimals),
        tokenOwner: umi.identity.publicKey,
        tokenStandard: TokenStandard.Fungible,
    }).sendAndConfirm(umi);

    return {
        signature: Buffer.from(tx.signature).toString('base64').slice(0, 44),
    };
}
