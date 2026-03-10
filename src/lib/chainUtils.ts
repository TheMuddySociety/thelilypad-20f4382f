// Re-use central config
import { SupportedChain, CHAINS } from '@/config/chains';

/**
 * Get the currency symbol for a given chain
 */
export const getCurrencySymbol = (chain: string): string => {
  const normalized = (chain || '').toLowerCase();
  if (normalized.includes('xrpl') || normalized.includes('xrp')) return 'XRP';
  if (normalized.includes('monad')) return 'MON';
  return 'SOL';
};

/**
 * Get the currency icon for a given chain
 */
export const getCurrencyIcon = (chain: string): string => {
  const normalized = (chain || '').toLowerCase();
  if (normalized.includes('xrpl') || normalized.includes('xrp')) return '✕';
  if (normalized.includes('monad')) return '◈';
  return '◎';
};

/**
 * Format price with the correct currency for the chain
 */
export const formatPriceWithCurrency = (
  price: string | number | null | undefined,
  chain: string
): string => {
  if (price === null || price === undefined) return 'TBA';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice) || numPrice === 0) return 'Free';
  return `${numPrice} ${getCurrencySymbol(chain)}`;
};

/**
 * Get the block explorer URL for a chain
 */
export const getExplorerUrl = (chain: string, network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'): string => {
  const baseChain = (chain || '').split('-')[0] as SupportedChain;
  const config = CHAINS[baseChain] || CHAINS.solana;
  const net = network === 'testnet' ? 'testnet' : network === 'devnet' ? 'devnet' : 'mainnet';
  return config.networks[net as keyof typeof config.networks]?.explorer || config.networks.testnet.explorer;
};

/**
 * Get transaction explorer URL
 */
export const getTxExplorerUrl = (
  txHash: string,
  chain: string,
  network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'
): string => {
  const baseChain = (chain || '').split('-')[0] as SupportedChain;
  const config = CHAINS[baseChain] || CHAINS.solana;
  const net = (network === 'testnet' || network === 'devnet') ? 'testnet' : 'mainnet';
  const explorer = config.networks[net as keyof typeof config.networks]?.explorer || config.networks.testnet.explorer;

  if (baseChain === 'solana') {
    const cluster = net === 'testnet' ? '?cluster=devnet' : '';
    return `${explorer}/tx/${txHash}${cluster}`;
  }
  if (baseChain === 'xrpl') {
    return `${explorer}/transactions/${txHash}`;
  }
  return `${explorer}/tx/${txHash}`;
};

/**
 * Check if a chain is a Solana chain
 */
export const isSolanaChain = (chain: string): boolean => {
  const normalizedChain = (chain || '').toLowerCase();
  // If it's empty, default to Solana for compatibility
  if (!normalizedChain) return true;
  return normalizedChain.includes('solana');
};

/**
 * Check if a chain is a testnet
 */
export const isTestnet = (chain: string): boolean => {
  const normalizedChain = (chain || '').toLowerCase();
  // Solana specific testnet/devnet check
  return normalizedChain.includes('testnet') ||
    normalizedChain.includes('devnet');
};

/**
 * Get the network display name
 */
export const getNetworkDisplayName = (chain: string, network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'): string => {
  const baseChain = (chain || '').split('-')[0] as SupportedChain;
  const config = CHAINS[baseChain] || CHAINS.solana;
  const netLabel = network === 'mainnet' ? 'Mainnet' : network === 'devnet' ? 'Devnet' : 'Testnet';
  return `${config.name} ${netLabel}`;
};

/**
 * Common helper to get price from a collection's phases
 */
export const getCollectionPrice = (collection: any): string => {
  if (!collection) return "TBA";
  const phases = collection.phases;
  if (!Array.isArray(phases) || phases.length === 0) return "TBA";

  const publicPhase = phases.find((p: any) => p.id === "public" || p.id === "public-mint") || phases[0];
  const currency = getCurrencySymbol(collection.chain || collection.blockchain);

  if (!publicPhase?.price || parseFloat(publicPhase.price) === 0) return "Free";
  return `${publicPhase.price} ${currency}`;
};

