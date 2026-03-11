/**
 * useChainCurrency — single source of truth for chain-aware currency display
 *
 * Returns the correct currency symbol, explorer URL builder, and price formatter
 * based on the CURRENTLY CONNECTED wallet chain. Every component that shows a
 * currency amount or blockchain explorer link should use this hook instead of
 * hardcoding "SOL".
 *
 * DESIGN RULES:
 *   - Use `symbol` when showing the connected wallet's chain currency
 *   - Use `currencyFor(chain)` when you know the specific chain from data (e.g. listing.chain)
 *   - Prefer `listing.currency` over re-deriving from `listing.chain` when available
 *   - Never hardcode 'SOL', 'XRP', or 'MON' in UI components
 */

import { useWallet } from '@/providers/WalletProvider';
import { getCurrencySymbol, getTxExplorerUrl, getExplorerUrl } from '@/lib/chainUtils';
import type { SupportedChain } from '@/config/chains';

export function useChainCurrency() {
  const { chainType, network } = useWallet();

  const resolvedChain = (chainType || 'solana') as SupportedChain;
  // WalletProvider uses NetworkType = 'mainnet' | 'testnet' | 'devnet'
  const resolvedNetwork = (network || 'devnet') as 'mainnet' | 'testnet' | 'devnet';

  /** Currency symbol for the connected wallet — 'XRP' | 'MON' | 'SOL' */
  const symbol = getCurrencySymbol(resolvedChain);

  /** Currency symbol for any specific chain string */
  const currencyFor = (chain: string | null | undefined): string =>
    getCurrencySymbol(chain || resolvedChain);

  /** Format a numeric price with the connected chain's currency (or specified chain) */
  const formatPrice = (price: number | string | null | undefined, chain?: string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : (price ?? 0);
    if (!price || isNaN(num) || num === 0) return 'Free';
    return `${num} ${currencyFor(chain)}`;
  };

  /** Build a transaction explorer URL for the given (or connected) chain */
  const txUrl = (hash: string, chain?: string): string =>
    getTxExplorerUrl(hash, chain || resolvedChain, resolvedNetwork);

  /** Build an address/account explorer URL for the given (or connected) chain */
  const addressUrl = (address: string, chain?: string): string => {
    const c = (chain || resolvedChain) as SupportedChain;
    const base = getExplorerUrl(c, resolvedNetwork);
    if (c === 'xrpl') return `${base}/accounts/${address}`;
    const cluster = resolvedNetwork !== 'mainnet' ? '?cluster=devnet' : '';
    return `${base}/address/${address}${cluster}`;
  };

  return {
    /** Symbol for the connected wallet chain: 'XRP' | 'MON' | 'SOL' */
    symbol,
    /** Connected chain id */
    chain: resolvedChain,
    /** Network mode */
    network: resolvedNetwork,
    /** Get currency symbol for a specific chain string (use when chain comes from data) */
    currencyFor,
    /** Format price with correct currency symbol */
    formatPrice,
    /** Transaction explorer URL */
    txUrl,
    /** Address/account explorer URL */
    addressUrl,
    /** Whether the connected chain is XRPL */
    isXRPL: resolvedChain === 'xrpl',
    /** Whether the connected chain is Monad */
    isMonad: resolvedChain === 'monad',
    /** Whether the connected chain is Solana */
    isSolana: resolvedChain === 'solana',
  };
}
