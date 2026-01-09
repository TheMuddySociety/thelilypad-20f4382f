import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import { mplInscription } from '@metaplex-foundation/mpl-inscription';
import { NetworkType } from './alchemy';

// Re-export NetworkType for convenience
export type { NetworkType } from './alchemy';

// Solana RPC endpoints using devnet for testnet mode
export const SOLANA_DEVNET_RPC = "https://api.devnet.solana.com";
export const SOLANA_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

export const getSolanaRpcUrl = (network: NetworkType): string => {
    return network === "mainnet" ? SOLANA_MAINNET_RPC : SOLANA_DEVNET_RPC;
};

/**
 * Initialize Umi with all Metaplex plugins and proper RPC connection
 */
export const initializeUmi = (network: NetworkType) => {
    const rpcUrl = getSolanaRpcUrl(network);
    console.log(`Initializing Umi with Solana ${network === 'mainnet' ? 'Mainnet' : 'Devnet'}: ${rpcUrl}`);

    const umi = createUmi(rpcUrl)
        .use(mplTokenMetadata())
        .use(mplCore())
        .use(mplBubblegum())
        .use(mplCandyMachine())
        .use(mplInscription());

    return umi;
};

/**
 * DAS API helper for fetching NFT assets on Solana
 * Uses the Digital Asset Standard API
 */
export const fetchSolanaAsset = async (
    nftAddress: string,
    network: NetworkType = 'testnet'
): Promise<any> => {
    const rpcUrl = getSolanaRpcUrl(network);

    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getAsset',
            params: { id: nftAddress },
        }),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch asset');
    }

    return data.result;
};

/**
 * Fetch multiple assets using DAS API
 */
export const fetchSolanaAssets = async (
    nftAddresses: string[],
    network: NetworkType = 'testnet'
): Promise<any[]> => {
    const rpcUrl = getSolanaRpcUrl(network);

    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getAssetBatch',
            params: { ids: nftAddresses },
        }),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch assets');
    }

    return data.result || [];
};

export type SolanaStandard =
    | 'core'
    | 'token-metadata'
    | 'bubblegum'
    | 'candy-machine'
    | 'inscription';

export const SOLANA_STANDARDS: { id: SolanaStandard; name: string; description: string }[] = [
    {
        id: 'core',
        name: 'Metaplex Core',
        description: 'Best for simple, low-cost assets. The modern standard for most use cases.'
    },
    {
        id: 'token-metadata',
        name: 'Token Metadata',
        description: 'Standard for Master Editions, Limited Editions, and legacy support. Best for 1/1s with prints.'
    },
    {
        id: 'bubblegum',
        name: 'Compressed NFTs (cNFT)',
        description: 'Best for large-scale generative collections (10k+ items) at ultra-low cost.'
    },
    {
        id: 'candy-machine',
        name: 'Candy Machine v3',
        description: 'Best for public mints, generative drops, and complex validation phases.'
    },
    {
        id: 'inscription',
        name: 'Inscriptions',
        description: 'Fully on-chain metadata stored permanently on the Solana ledger.'
    }
];
