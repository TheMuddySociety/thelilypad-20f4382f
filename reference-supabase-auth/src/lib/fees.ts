// 1 SOL = 1,000,000,000 Lamports
export const LAMPORTS_PER_SOL = 1_000_000_000n;

export const PLATFORM_FEE_BPS = 250; // 2.5%
export const PLATFORM_TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'TreasuryAddressHere'; // Replace with actual address or env var

/**
 * Calculate the platform fee for a given price
 * @param priceLamports Price in Lamports
 * @returns Fee in Lamports
 */
export function calculatePlatformFee(priceLamports: number | bigint): bigint {
    const price = BigInt(priceLamports);
    return (price * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
}

/**
 * Calculate the net amount the seller receives
 * @param priceLamports Price in Lamports
 * @returns Net amount in Lamports
 */
export function calculateSellerNet(priceLamports: number | bigint): bigint {
    const price = BigInt(priceLamports);
    const fee = calculatePlatformFee(price);
    return price - fee;
}

/**
 * Format fee details for UI display
 * @param priceSol Price in SOL
 */
export function getFeeDetails(priceSol: number) {
    const priceLamports = BigInt(Math.round(priceSol * Number(LAMPORTS_PER_SOL)));
    const feeLamports = calculatePlatformFee(priceLamports);
    const netLamports = calculateSellerNet(priceLamports);

    return {
        price: priceSol,
        fee: Number(feeLamports) / Number(LAMPORTS_PER_SOL),
        net: Number(netLamports) / Number(LAMPORTS_PER_SOL),
        bps: PLATFORM_FEE_BPS,
    };
}
