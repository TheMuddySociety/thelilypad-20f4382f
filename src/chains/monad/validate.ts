/**
 * Monad (EVM) Chain Validation — Royalty and Address Checks
 */

/**
 * Validate Monad ERC-2981 royalty percentage and convert to basis points.
 * @param pct Royalty percentage (0–100)
 * @returns royaltyBasisPoints (0–10000)
 */
export function validateMonadRoyalty(pct: number): number {
    if (pct < 0 || pct > 100) throw new Error('ERC-2981 royalty must be 0–100%');
    return Math.round(pct * 100); // EVM basis points
}

/**
 * Validate an EVM (0x) address.
 */
export function validateEvmAddress(addr: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(addr);
}
