/**
 * Monad Client - EVM provider setup for Monad chain
 */

import { MonadNetwork, getMonadChainId } from '@/config/monad';

/**
 * Create Monad EVM provider
 */
export async function createMonadProvider(network: MonadNetwork = 'testnet') {
    if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No EVM wallet found');
    }

    const chainId = getMonadChainId(network);
    console.log(`[Monad] Initializing provider for ${network} (chainId: ${chainId})`);

    return {
        network,
        chainId,
        provider: window.ethereum,
    };
}

/**
 * Connect Monad wallet
 */
export async function connectMonadWallet(): Promise<string | null> {
    if (typeof window === 'undefined' || !window.ethereum) {
        return null;
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return accounts && accounts.length > 0 ? accounts[0] : null;
}
