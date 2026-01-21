import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import { mplCandyMachine as mplCoreCandyMachinePlugin } from '@metaplex-foundation/mpl-core-candy-machine';
import { mplInscription } from '@metaplex-foundation/mpl-inscription';
// Solana RPC endpoints
export const SOLANA_DEVNET_RPC = "https://api.devnet.solana.com";
export const SOLANA_TESTNET_RPC = "https://api.testnet.solana.com";
export const SOLANA_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

export type NetworkType = "mainnet" | "testnet" | "devnet";

// Simple health check for Solana RPC
export interface RpcHealthStatus {
    url: string;
    healthy: boolean;
    latency: number | null;
    error?: string;
}

export const checkRpcHealth = async (rpcUrl: string, timeout = 5000): Promise<RpcHealthStatus> => {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth", params: [] }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const latency = Date.now() - start;
        if (!response.ok) {
            return { url: rpcUrl, healthy: false, latency, error: `HTTP ${response.status}` };
        }
        const data = await response.json();
        if (data.result === "ok") {
            return { url: rpcUrl, healthy: true, latency };
        }
        return { url: rpcUrl, healthy: false, latency, error: "Unexpected response" };
    } catch (e) {
        return { url: rpcUrl, healthy: false, latency: null, error: (e as Error).message };
    }
};

export const getSolanaRpcUrl = (network: NetworkType): string => {
    switch (network) {
        case "mainnet":
            return SOLANA_MAINNET_RPC;
        case "testnet":
            return SOLANA_TESTNET_RPC;
        case "devnet":
        default:
            return SOLANA_DEVNET_RPC;
    }
};

export const getBestRpc = async (network: NetworkType): Promise<string | null> => {
    const rpcUrl = getSolanaRpcUrl(network);
    const health = await checkRpcHealth(rpcUrl);
    return health.healthy ? rpcUrl : null;
};

// Get preferred RPC from localStorage
export const getPreferredRpcUrl = (network: NetworkType = "devnet"): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(`preferredRpc_${network}`);
    }
    return null;
};

// Get RPC URL based on network type
export const getRpcUrl = (network: NetworkType = "devnet"): string => {
    const preferred = getPreferredRpcUrl(network);
    if (preferred) return preferred;
    return getSolanaRpcUrl(network);
};

/**
 * Initialize Umi with all Metaplex plugins and proper RPC connection
 */
export const initializeUmi = (network: NetworkType) => {
    const rpcUrl = getSolanaRpcUrl(network);
    console.log(`Initializing Umi with Solana ${network}: ${rpcUrl}`);

    const umi = createUmi(rpcUrl)
        .use(mplTokenMetadata())
        .use(mplCore())
        .use(mplBubblegum())
        .use(mplCandyMachine())
        .use(mplCoreCandyMachinePlugin())
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

export type CollectionType = 'generative' | 'one_of_one' | 'editions' | 'music';

export interface StandardFeatures {
    // Collection types supported by this standard
    supportedTypes: CollectionType[];
    // Feature flags
    supportsCompression: boolean;
    supportsMasterEdition: boolean;
    supportsCandyMachine: boolean;
    supportsOnChainMetadata: boolean;
    supportsRoyalties: boolean;
    supportsMusic: boolean;
    supportsBulkMint: boolean;
    supportsAllowlist: boolean;
    supportsReveal: boolean;
    // Cost info
    costPerMint: string;
    costDescription: string;
    // UI guidance
    recommendedFor: string[];
    notRecommendedFor: string[];
    tips: string[];
    // Badge info
    badge: { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' };
}

export interface SolanaStandardConfig {
    id: SolanaStandard;
    name: string;
    description: string;
    icon: 'sparkles' | 'file-text' | 'boxes' | 'gift' | 'layers';
    features: StandardFeatures;
}

export const SOLANA_STANDARDS_CONFIG: Record<SolanaStandard, SolanaStandardConfig> = {
    'core': {
        id: 'core',
        name: 'Metaplex Core',
        description: 'Modern NFT standard with low gas costs. Best for new collections.',
        icon: 'sparkles',
        features: {
            supportedTypes: ['generative', 'one_of_one', 'editions', 'music'],
            supportsCompression: false,
            supportsMasterEdition: false,
            supportsCandyMachine: true,
            supportsOnChainMetadata: false,
            supportsRoyalties: true,
            supportsMusic: true,
            supportsBulkMint: true,
            supportsAllowlist: true,
            supportsReveal: true,
            costPerMint: '~0.005 SOL',
            costDescription: 'Lowest cost for standard NFTs',
            recommendedFor: ['General collections', 'PFP projects', 'Music NFTs', 'Art drops'],
            notRecommendedFor: ['Large 10k+ collections needing ultra-low costs'],
            tips: [
                'Use Core for most new projects - it\'s the modern standard',
                'Perfect for collections of any size',
                'Full Candy Machine integration for fair launches'
            ],
            badge: { label: 'Recommended', variant: 'default' }
        }
    },
    'token-metadata': {
        id: 'token-metadata',
        name: 'Token Metadata',
        description: 'Classic Metaplex standard with Master Editions. Best for 1/1s with prints.',
        icon: 'file-text',
        features: {
            supportedTypes: ['one_of_one', 'editions'],
            supportsCompression: false,
            supportsMasterEdition: true,
            supportsCandyMachine: true,
            supportsOnChainMetadata: false,
            supportsRoyalties: true,
            supportsMusic: false,
            supportsBulkMint: true,
            supportsAllowlist: true,
            supportsReveal: true,
            costPerMint: '~0.01 SOL',
            costDescription: 'Standard cost with maximum compatibility',
            recommendedFor: ['1/1 Art with print editions', 'Legacy marketplace support', 'Master Edition prints'],
            notRecommendedFor: ['New generative collections', 'Music NFTs', 'Cost-sensitive projects'],
            tips: [
                'Choose supply type: Unlimited, Limited, or One-of-a-Kind',
                'Master Editions allow you to create prints/copies',
                'Best marketplace compatibility across Solana'
            ],
            badge: { label: 'Classic', variant: 'secondary' }
        }
    },
    'bubblegum': {
        id: 'bubblegum',
        name: 'Compressed NFTs (cNFT)',
        description: 'Ultra-low cost compressed NFTs for large-scale collections (10k+).',
        icon: 'boxes',
        features: {
            supportedTypes: ['generative'],
            supportsCompression: true,
            supportsMasterEdition: false,
            supportsCandyMachine: true,
            supportsOnChainMetadata: false,
            supportsRoyalties: true,
            supportsMusic: false,
            supportsBulkMint: true,
            supportsAllowlist: true,
            supportsReveal: false,
            costPerMint: '~0.0001 SOL',
            costDescription: 'Cheapest option - 100x less than Core',
            recommendedFor: ['10k+ generative collections', 'Gaming assets', 'Loyalty programs', 'Mass airdrops'],
            notRecommendedFor: ['1/1 art', 'Music NFTs', 'Collections needing full on-chain data'],
            tips: [
                'Ideal for 10,000+ item collections',
                'Uses Merkle trees for compression',
                'Some marketplaces may have limited cNFT support'
            ],
            badge: { label: 'Low Cost', variant: 'outline' }
        }
    },
    'candy-machine': {
        id: 'candy-machine',
        name: 'Candy Machine v3',
        description: 'Fair launch system with bot protection and advanced minting features.',
        icon: 'gift',
        features: {
            supportedTypes: ['generative', 'editions'],
            supportsCompression: false,
            supportsMasterEdition: false,
            supportsCandyMachine: true,
            supportsOnChainMetadata: false,
            supportsRoyalties: true,
            supportsMusic: false,
            supportsBulkMint: true,
            supportsAllowlist: true,
            supportsReveal: true,
            costPerMint: '~0.02 SOL',
            costDescription: 'Higher cost for advanced launch features',
            recommendedFor: ['Fair public launches', 'Multi-phase mints', 'Bot-protected drops'],
            notRecommendedFor: ['Simple 1/1 mints', 'Music NFTs', 'Low-budget projects'],
            tips: [
                'Built-in bot protection with guards',
                'Perfect for multi-phase launches (WL, Public)',
                'Supports time-based and quantity-based phases'
            ],
            badge: { label: 'Fair Launch', variant: 'secondary' }
        }
    },
    'inscription': {
        id: 'inscription',
        name: 'Inscriptions',
        description: 'Fully on-chain metadata stored permanently on the Solana ledger.',
        icon: 'layers',
        features: {
            supportedTypes: ['one_of_one'],
            supportsCompression: false,
            supportsMasterEdition: false,
            supportsCandyMachine: false,
            supportsOnChainMetadata: true,
            supportsRoyalties: false,
            supportsMusic: false,
            supportsBulkMint: false,
            supportsAllowlist: false,
            supportsReveal: false,
            costPerMint: '~0.05+ SOL',
            costDescription: 'Highest cost - data stored on-chain',
            recommendedFor: ['Permanent on-chain art', 'Historical records', 'Immutable collections'],
            notRecommendedFor: ['Large collections', 'Cost-sensitive projects', 'Generative art'],
            tips: [
                'Data is stored directly on Solana - truly immutable',
                'Best for small, high-value pieces',
                'No external metadata dependencies'
            ],
            badge: { label: 'On-Chain', variant: 'outline' }
        }
    }
};

// Legacy format for backward compatibility
export const SOLANA_STANDARDS: { id: SolanaStandard; name: string; description: string }[] = 
    Object.values(SOLANA_STANDARDS_CONFIG).map(config => ({
        id: config.id,
        name: config.name,
        description: config.description
    }));

// Helper: Get features for a standard
export const getStandardFeatures = (standard: SolanaStandard): StandardFeatures => {
    return SOLANA_STANDARDS_CONFIG[standard].features;
};

// Helper: Get supported collection types for a standard
export const getSupportedCollectionTypes = (standard: SolanaStandard): CollectionType[] => {
    return SOLANA_STANDARDS_CONFIG[standard].features.supportedTypes;
};

// Helper: Check if a standard supports a specific collection type
export const standardSupportsType = (standard: SolanaStandard, type: CollectionType): boolean => {
    return SOLANA_STANDARDS_CONFIG[standard].features.supportedTypes.includes(type);
};

// Helper: Get recommended standard for a collection type
export const getRecommendedStandard = (type: CollectionType): SolanaStandard => {
    switch (type) {
        case 'music':
            return 'core';
        case 'generative':
            return 'core';
        case 'one_of_one':
            return 'core';
        case 'editions':
            return 'token-metadata';
        default:
            return 'core';
    }
};
