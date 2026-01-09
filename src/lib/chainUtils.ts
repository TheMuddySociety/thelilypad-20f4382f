/**
 * Chain-aware utility functions for currency display and blockchain interactions
 * Solana Launchpad Edition
 */

export type ChainValue = 'solana' | 'solana-devnet' | string;

/**
 * Get the currency symbol for a given chain (Defaults to SOL)
 */
export const getCurrencySymbol = (chain: ChainValue | string): string => {
  return 'SOL';
};

/**
 * Get the currency icon for a given chain (Defaults to ◎)
 */
export const getCurrencyIcon = (chain: ChainValue | string): string => {
  return '◎';
};

/**
 * Format price with the correct currency for the chain
 */
export const formatPriceWithCurrency = (
  price: string | number | null | undefined,
  chain: ChainValue | string
): string => {
  if (price === null || price === undefined) return 'TBA';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice) || numPrice === 0) return 'Free';
  return `${numPrice} ${getCurrencySymbol(chain)}`;
};

/**
 * Get the block explorer URL for a chain (Solana only)
 */
export const getExplorerUrl = (chain: ChainValue | string, network: 'mainnet' | 'testnet' = 'testnet'): string => {
  const normalizedChain = chain?.toLowerCase() || "";
  // Check if explicit devnet or testnet network context
  const isDevnet = normalizedChain.includes('devnet') || network === 'testnet';
  return isDevnet
    ? 'https://explorer.solana.com?cluster=devnet'
    : 'https://explorer.solana.com';
};

/**
 * Get transaction explorer URL
 */
export const getTxExplorerUrl = (
  txHash: string,
  chain: ChainValue | string,
  network: 'mainnet' | 'testnet' = 'testnet'
): string => {
  const normalizedChain = chain?.toLowerCase() || "";
  const isDevnet = normalizedChain.includes('devnet') || network === 'testnet';
  const cluster = isDevnet ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/tx/${txHash}${cluster}`;
};

/**
 * Check if a chain is a Solana chain (Always true in this context, but kept for compatibility)
 */
export const isSolanaChain = (chain: ChainValue | string): boolean => {
  return true;
};

/**
 * Check if a chain is a testnet
 */
export const isTestnet = (chain: ChainValue | string): boolean => {
  const normalizedChain = chain?.toLowerCase() || "";
  // Solana specific testnet/devnet check
  return normalizedChain.includes('testnet') ||
    normalizedChain.includes('devnet');
};

/**
 * Get the network display name
 */
export const getNetworkDisplayName = (chain: ChainValue | string): string => {
  const normalizedChain = chain?.toLowerCase() || "";
  if (normalizedChain.includes('devnet')) return 'Solana Devnet';
  return 'Solana';
};

