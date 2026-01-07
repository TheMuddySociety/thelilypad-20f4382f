/**
 * Chain-aware utility functions for currency display
 */

export type ChainValue = 'monad' | 'solana';

/**
 * Get the currency symbol for a given chain
 */
export const getCurrencySymbol = (chain: ChainValue | string): string => {
  return chain === 'solana' ? 'SOL' : 'MON';
};

/**
 * Get the currency icon for a given chain
 */
export const getCurrencyIcon = (chain: ChainValue | string): string => {
  return chain === 'solana' ? '◎' : '⟠';
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
 * Get the block explorer URL for a chain
 */
export const getExplorerUrl = (chain: ChainValue | string, network: 'mainnet' | 'testnet' = 'testnet'): string => {
  if (chain === 'solana') {
    return network === 'mainnet' 
      ? 'https://solscan.io' 
      : 'https://solscan.io?cluster=devnet';
  }
  return network === 'mainnet'
    ? 'https://monadexplorer.com'
    : 'https://testnet.monadexplorer.com';
};

/**
 * Get transaction explorer URL
 */
export const getTxExplorerUrl = (
  txHash: string, 
  chain: ChainValue | string, 
  network: 'mainnet' | 'testnet' = 'testnet'
): string => {
  if (chain === 'solana') {
    const cluster = network === 'mainnet' ? '' : '?cluster=devnet';
    return `https://solscan.io/tx/${txHash}${cluster}`;
  }
  const baseUrl = network === 'mainnet' 
    ? 'https://monadexplorer.com' 
    : 'https://testnet.monadexplorer.com';
  return `${baseUrl}/tx/${txHash}`;
};
