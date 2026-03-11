// Platform Treasury Configuration for On-Chain Transactions
import { PublicKey } from '@solana/web3.js';

// Platform wallet addresses for fee distribution
export const PLATFORM_WALLETS = {
  solana: {
    treasury: 'BQefQgbpAqPjoGKLTmAA2haZh9pEURYNefPFwsTotgem',
    team: 'BQefQgbpAqPjoGKLTmAA2haZh9pEURYNefPFwsTotgem',
    creator: 'BQefQgbpAqPjoGKLTmAA2haZh9pEURYNefPFwsTotgem',
    buybackPool: 'BQefQgbpAqPjoGKLTmAA2haZh9pEURYNefPFwsTotgem',
  },
  xrpl: {
    treasury: 'rXYdhW4ZHdzt27VuHJgNwbD1aJjcKZJ9M',
    team: 'rXYdhW4ZHdzt27VuHJgNwbD1aJjcKZJ9M',
    creator: 'rXYdhW4ZHdzt27VuHJgNwbD1aJjcKZJ9M',
    buybackPool: 'rXYdhW4ZHdzt27VuHJgNwbD1aJjcKZJ9M',
  },
  monad: {
    treasury: '0x54Ac7Bcaba9A41b701066B7D8b204Ec14b72C96E',
    team: '0x54Ac7Bcaba9A41b701066B7D8b204Ec14b72C96E', // Using main for others until specified
    creator: '0x54Ac7Bcaba9A41b701066B7D8b204Ec14b72C96E',
    buybackPool: '0x54Ac7Bcaba9A41b701066B7D8b204Ec14b72C96E',
  }
} as const;

// Get wallet address for a platform wallet on a specific chain
export function getPlatformWallet(
  wallet: keyof typeof PLATFORM_WALLETS.solana,
  chain: 'solana' | 'xrpl' | 'monad' = 'solana'
): string {
  return (PLATFORM_WALLETS as any)[chain]?.[wallet] || PLATFORM_WALLETS.solana[wallet];
}

// Get PublicKey for a platform wallet (Solana only)
export function getPlatformWalletPubkey(wallet: keyof typeof PLATFORM_WALLETS.solana): PublicKey {
  return new PublicKey(PLATFORM_WALLETS.solana[wallet]);
}

// Platform Treasury Configuration for On-Chain Transactions
export const TREASURY_CONFIG = {
  // Main treasury wallet for receiving platform fees (legacy, use PLATFORM_WALLETS.solana.treasury)
  treasuryWallet: PLATFORM_WALLETS.solana.treasury,
  
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
    
    // Launchpad/Minting fees
    launchpad: {
      platformFee: 500, // 5% platform fee on mints
      buybackAllocation: 100, // 1% goes to buyback pool (from platform fee)
      teamAllocation: 100, // 1% goes to team (from platform fee)
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
    mint: 0.001,
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

// Get detailed launchpad fee breakdown
export function getLaunchpadFeeSplit(mintPrice: number): {
  creatorAmount: number;
  treasuryAmount: number;
  teamAmount: number;
  buybackAmount: number;
  total: number;
} {
  const { launchpad } = TREASURY_CONFIG.fees;
  const platformFeeAmount = (mintPrice * launchpad.platformFee) / 10000;
  const teamAmount = (mintPrice * launchpad.teamAllocation) / 10000;
  const buybackAmount = (mintPrice * launchpad.buybackAllocation) / 10000;
  const treasuryAmount = platformFeeAmount - teamAmount - buybackAmount;
  const creatorAmount = mintPrice - platformFeeAmount;
  
  return {
    creatorAmount,
    treasuryAmount,
    teamAmount,
    buybackAmount,
    total: mintPrice,
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
