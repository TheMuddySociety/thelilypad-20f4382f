/**
 * Solana Type Definitions
 */

import { Signer } from '@metaplex-foundation/umi';

export interface SolanaCollectionParams {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints?: number;
    creators?: Array<{ address: string; share: number }>;
}

export interface SolanaCollectionResult {
    address: string;
    signer: Signer;
}

export interface CandyMachineConfig {
    collectionMint: string;
    itemsAvailable: number;
    prefixUri?: string;
    treasuryWallet?: string;
}

export interface CandyMachineItem {
    name: string;
    uri: string;
}

export type SolanaStandard = 'core' | 'token-metadata';
