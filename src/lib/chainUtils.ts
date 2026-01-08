/**
 * Chain-aware utility functions for currency display and blockchain interactions
 */

export type ChainValue = 'monad' | 'solana' | 'solana-devnet' | 'monad-testnet' | string;

/**
 * Get the currency symbol for a given chain
 */
export const getCurrencySymbol = (chain: ChainValue | string): string => {
  const normalizedChain = chain?.toLowerCase() || "";
  if (normalizedChain.includes('solana')) return 'SOL';
  if (normalizedChain.includes('monad')) return 'MON';
  if (normalizedChain.includes('ethereum') || normalizedChain.includes('eth')) return 'ETH';
  if (normalizedChain.includes('polygon')) return 'MATIC';
  return 'MON';
};

/**
 * Get the currency icon for a given chain
 */
export const getCurrencyIcon = (chain: ChainValue | string): string => {
  const normalizedChain = chain?.toLowerCase() || "";
  if (normalizedChain.includes('solana')) return '◎';
  if (normalizedChain.includes('monad')) return '⟠';
  if (normalizedChain.includes('ethereum') || normalizedChain.includes('eth')) return 'Ξ';
  return '⟠';
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
  const normalizedChain = chain?.toLowerCase() || "";
  if (normalizedChain.includes('solana')) {
    const isDevnet = normalizedChain.includes('devnet') || network === 'testnet';
    return isDevnet 
      ? 'https://explorer.solana.com?cluster=devnet' 
      : 'https://explorer.solana.com';
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
  const normalizedChain = chain?.toLowerCase() || "";
  if (normalizedChain.includes('solana')) {
    const isDevnet = normalizedChain.includes('devnet') || network === 'testnet';
    const cluster = isDevnet ? '?cluster=devnet' : '';
    return `https://explorer.solana.com/tx/${txHash}${cluster}`;
  }
  const baseUrl = network === 'mainnet' 
    ? 'https://monadexplorer.com' 
    : 'https://testnet.monadexplorer.com';
  return `${baseUrl}/tx/${txHash}`;
};

/**
 * Check if a chain is a Solana chain
 */
export const isSolanaChain = (chain: ChainValue | string): boolean => {
  return chain?.toLowerCase()?.includes('solana') || false;
};

/**
 * Check if a chain is a testnet
 */
export const isTestnet = (chain: ChainValue | string): boolean => {
  const normalizedChain = chain?.toLowerCase() || "";
  return normalizedChain.includes('testnet') || 
         normalizedChain.includes('devnet') || 
         normalizedChain.includes('sepolia');
};

/**
 * Get the network display name
 */
export const getNetworkDisplayName = (chain: ChainValue | string): string => {
  const normalizedChain = chain?.toLowerCase() || "";
  if (normalizedChain.includes('solana-devnet') || normalizedChain === 'solana-devnet') return 'Solana Devnet';
  if (normalizedChain.includes('solana')) return 'Solana';
  if (normalizedChain.includes('monad-testnet') || normalizedChain === 'monad-testnet') return 'Monad Testnet';
  if (normalizedChain.includes('monad')) return 'Monad';
  return chain || 'Unknown';
};
