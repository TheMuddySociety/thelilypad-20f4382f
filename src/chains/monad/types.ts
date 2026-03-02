/**
 * Monad Types - Type definitions for Mon ad chain operations
 */

export interface MonadCollectionParams {
    name: string;
    symbol: string;
    description?: string;
    imageUri?: string;
    metadataBaseUri?: string;
    totalSupply: number;
    royaltyBasisPoints?: number;
    maxMintPerWallet?: number;
    mintPrice?: string; // In MON
}

export interface MonadDeployResult {
    success: boolean;
    address?: string;
    transactionHash?: string;
    error?: string;
}
