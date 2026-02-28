/**
 * XRPL Chain Validation — Royalty (TransferFee) and Address Checks
 */

/**
 * Validate XRPL royalty percentage and convert to TransferFee.
 * XRPL enforces a maximum of 50% (50000 in TransferFee units).
 * @param pct Royalty percentage (0–50)
 * @returns transferFee (0–50000)
 */
export function validateXRPLRoyalty(pct: number): number {
    if (pct < 0 || pct > 50) throw new Error('XRPL royalties cannot exceed 50%');
    return Math.round(pct * 1000); // transferFee (1000 = 1%)
}

/**
 * Validate an XRPL classic address (r-address).
 */
export function validateXRPLAddress(addr: string): boolean {
    return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(addr);
}
