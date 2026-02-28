/**
 * Solana Chain Validation — Royalty and Address Checks
 */

/**
 * Validate Solana royalty percentage and convert to sellerFeeBasisPoints.
 * @param pct Royalty percentage (0–100)
 * @returns sellerFeeBasisPoints (0–10000)
 */
export function validateSolanaRoyalty(pct: number): number {
    if (pct < 0 || pct > 100) throw new Error('Solana royalty must be 0–100%');
    return Math.round(pct * 100); // sellerFeeBasisPoints
}

/**
 * Validate a Solana base58 address.
 */
export function validateSolanaAddress(addr: string): boolean {
    // Base58 check: 32-44 characters, no 0OIl
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}
