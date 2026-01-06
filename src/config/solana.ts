import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import { mplInscription } from '@metaplex-foundation/mpl-inscription';
import { NetworkType } from './alchemy';

export const SOLANA_DEVNET_RPC = "https://api.devnet.solana.com";
export const SOLANA_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

export const getSolanaRpcUrl = (network: NetworkType): string => {
    return network === "mainnet" ? SOLANA_MAINNET_RPC : SOLANA_DEVNET_RPC;
};

/**
 * Initialize Umi with all Metaplex plugins
 */
export const initializeUmi = (network: NetworkType) => {
    const rpcUrl = getSolanaRpcUrl(network);
    const umi = createUmi(rpcUrl)
        .use(mplTokenMetadata())
        .use(mplCore())
        .use(mplBubblegum())
        .use(mplCandyMachine())
        .use(mplInscription());

    return umi;
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
        description: 'Next-gen, ultra-efficient NFT standard with low gas and complex utility.'
    },
    {
        id: 'token-metadata',
        name: 'Token Metadata',
        description: 'The classic Solana NFT standard. Maximum compatibility across all wallets and marketplaces.'
    },
    {
        id: 'bubblegum',
        name: 'Compressed NFTs (cNFT)',
        description: 'Ultra-low cost for large collections. Perfect for 10k+ drops where mint costs matter.'
    },
    {
        id: 'candy-machine',
        name: 'Candy Machine v3',
        description: 'Fair launch distribution with complex mint phases, allowlists, and bot protection.'
    },
    {
        id: 'inscription',
        name: 'Inscriptions',
        description: 'Fully on-chain metadata stored permanently on the Solana ledger.'
    }
];
