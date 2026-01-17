// Platform Treasury Configuration for On-Chain Transactions

// Platform treasury wallet address (receives all platform fees)
export const TREASURY_CONFIG = {
  // Main treasury wallet for receiving platform fees
  treasuryWallet: 'LiLYPAdXjQnVSmHsuf2RVdU2Zk3hMWxPFxbM6EYpump',
  
  // Fee percentages (in basis points, 100 = 1%)
  fees: {
    // NFT Marketplace fees
    marketplace: {
      platformFee: 250, // 2.5% platform fee on sales
      creatorRoyalty: 500, // 5% max creator royalty (configurable per collection)
    },
    
    // Shop purchases (stickers, emotes, bundles)
    shop: {
      platformFee: 1000, // 10% platform fee on shop sales
      creatorShare: 9000, // 90% goes to creator
    },
    
    // Raffles
    raffle: {
      platformFee: 500, // 5% platform fee on raffle entries
      prizePool: 9500, // 95% goes to prize pool
    },
    
    // Blind boxes
    blindBox: {
      platformFee: 1000, // 10% platform fee
    },
    
    // Tips/donations
    tips: {
      platformFee: 0, // 0% fee on tips - 100% goes to creator
    },
  },
  
  // Minimum transaction amounts (in SOL)
  minimums: {
    listing: 0.001,
    offer: 0.001,
    shopPurchase: 0.0001,
    raffleEntry: 0.001,
    blindBox: 0.01,
    tip: 0.001,
  },
};

// Calculate platform fee from amount
export function calculatePlatformFee(
  amount: number,
  feeType: keyof typeof TREASURY_CONFIG.fees
): number {
  const feeConfig = TREASURY_CONFIG.fees[feeType];
  const feeBps = 'platformFee' in feeConfig ? feeConfig.platformFee : 0;
  return (amount * feeBps) / 10000;
}

// Calculate creator share from amount
export function calculateCreatorShare(
  amount: number,
  feeType: keyof typeof TREASURY_CONFIG.fees
): number {
  const platformFee = calculatePlatformFee(amount, feeType);
  return amount - platformFee;
}

// Get split amounts for a transaction
export function getTransactionSplit(
  amount: number,
  feeType: keyof typeof TREASURY_CONFIG.fees
): { platformAmount: number; creatorAmount: number; total: number } {
  const platformAmount = calculatePlatformFee(amount, feeType);
  const creatorAmount = amount - platformAmount;
  
  return {
    platformAmount,
    creatorAmount,
    total: amount,
  };
}

// Validate minimum transaction amount
export function validateMinimumAmount(
  amount: number,
  transactionType: keyof typeof TREASURY_CONFIG.minimums
): { valid: boolean; minimum: number; message?: string } {
  const minimum = TREASURY_CONFIG.minimums[transactionType];
  
  if (amount < minimum) {
    return {
      valid: false,
      minimum,
      message: `Minimum amount is ${minimum} SOL`,
    };
  }
  
  return { valid: true, minimum };
}
