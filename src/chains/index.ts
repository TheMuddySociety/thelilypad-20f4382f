/**
 * Unified Chain Abstraction - Factory for multi-chain clients
 */

import { SupportedChain } from '@/config/chains';
import * as solana from './solana/client';
import * as xrpl from './xrpl/client';
import * as monad from './monad/client';

export type { SolanaNetwork } from './solana/client';
export type { XRPLNetwork } from './xrpl/client';

// Re-export chain-specific modules
export { solana, xrpl, monad };

// Re-export types
export type { SolanaCollectionParams, SolanaCollectionResult, CandyMachineItem } from './solana/types';
export type { XRPLCollectionParams, XRPLDeployResult, XRPLMintItem } from './xrpl/types';
export type { MonadCollectionParams, MonadDeployResult } from './monad/types';

// Re-export program wrappers
export { createCoreCollection, createCoreCandyMachine, insertItemsToCandyMachine, LaunchpadPhase } from './solana/programs';
export { deployXRPLCollection, mintXRPLItems, setAccountDomain, resolveAccountDomain } from './xrpl/domain';
export { deployMonadCollection, mintMonadNFT } from './monad/contracts';

// Re-export metadata utilities
export { uploadFile, uploadFiles, uploadMetadata, uploadJsonBatch, resolveMetadataUri, resolveImageUri } from './solana/metadata';

/**
 * Get chain client based on supported chain
 */
export function getChainClient(chain: SupportedChain) {
    switch (chain) {
        case 'solana':
        case 'solana-devnet':
            return solana;
        case 'xrpl':
        case 'xrpl-testnet':
            return xrpl;
        case 'monad':
        case 'monad-testnet':
            return monad;
        default:
            throw new Error(`Unsupported chain: ${chain}`);
    }
}
