import { createUmi as createUmiClient } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplCandyMachine as mplCoreCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { Umi } from '@metaplex-foundation/umi';
import { WalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Solana Client - Centralized Umi initialization and connection management
 */

// RPC endpoints by network
const RPC_ENDPOINTS = {
    mainnet: [
        'https://api.mainnet-beta.solana.com',
        'https://solana-mainnet.g.alchemy.com/v2/demo',
    ],
    devnet: [
        'https://api.devnet.solana.com',
        'https://devnet.helius-rpc.com/?api-key=demo',
    ],
} as const;

export type SolanaNetwork = 'mainnet' | 'devnet';

/**
 * Create and configure Umi client
 */
export function createUmi(
    network: SolanaNetwork = 'devnet',
    wallet?: WalletAdapter | null
): Umi {
    const endpoint = RPC_ENDPOINTS[network][0]; // Use primary RPC

    const umi = createUmiClient(endpoint)
        .use(mplCore())
        .use(mplCoreCandyMachine())
        .use(mplToolbox())
        .use(irysUploader());

    // Attach wallet if provided
    if (wallet) {
        umi.use(walletAdapterIdentity(wallet));
    }

    return umi;
}

/**
 * Get current RPC endpoint for a network
 */
export function getRpcEndpoint(network: SolanaNetwork): string {
    return RPC_ENDPOINTS[network][0];
}

/**
 * Get all RPC endpoints for failover
 */
export function getAllRpcEndpoints(network: SolanaNetwork): string[] {
    return [...RPC_ENDPOINTS[network]];
}
