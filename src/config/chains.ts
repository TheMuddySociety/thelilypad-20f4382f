/**
 * Multi-Chain Configuration
 * 
 * Unified chain configuration for SOL, wXRP, and MON support
 */

export type SupportedChain = 'solana' | 'xrpl' | 'monad';

export interface ChainNetwork {
    url: string;
    name: string;
    chainId?: number; // For EVM chains
    explorer: string;
}

// Theme configuration for chain-aware UI
export interface ChainThemeConfig {
    primaryColor: string;      // Main brand color
    secondaryColor: string;    // Accent color
    background: string;        // Tailwind gradient classes
    cardBorder: string;        // Border color with opacity
    glowColor: string;         // For animations and highlights
    buttonGradient: string;    // Gradient for primary buttons
}

// Wallet connection labels per chain
export interface ChainWalletLabels {
    connect: string;           // e.g., "Connect Phantom"
    disconnect: string;        // e.g., "Disconnect Phantom"
    connecting: string;        // e.g., "Connecting to Phantom..."
}

export interface ChainConfig {
    id: SupportedChain;
    name: string;
    symbol: string;
    iconName: 'solana' | 'xrp' | 'monad'; // For icon display
    color: string; // Brand color (legacy - use theme.primaryColor instead)
    theme: ChainThemeConfig;
    walletLabels: ChainWalletLabels;
    networks: {
        mainnet: ChainNetwork;
        testnet: ChainNetwork;
        devnet?: ChainNetwork;
    };
    walletType: 'phantom' | 'xrpl' | 'evm';
    nftStandard: string;
    isActive: boolean; // Feature flag
    isTestnetOnly: boolean; // For chains still in testnet
    description: string;
}

export const CHAINS: Record<SupportedChain, ChainConfig> = {
    solana: {
        id: 'solana',
        name: 'Solana',
        symbol: 'SOL',
        iconName: 'solana',
        color: '#9945FF',
        theme: {
            primaryColor: '#14F195',
            secondaryColor: '#9945FF',
            background: 'from-[#0f2027] via-[#203a43] to-[#2c5364]',
            cardBorder: '#14F19540',
            glowColor: '#14F195',
            buttonGradient: 'from-[#14F195] to-[#9945FF]',
        },
        walletLabels: {
            connect: 'Connect Phantom',
            disconnect: 'Disconnect Phantom',
            connecting: 'Connecting to Phantom...',
        },
        networks: {
            mainnet: {
                url: 'https://api.mainnet-beta.solana.com',
                name: 'Mainnet',
                explorer: 'https://solscan.io',
            },
            testnet: {
                url: 'https://api.testnet.solana.com',
                name: 'Testnet',
                explorer: 'https://solscan.io/?cluster=testnet',
            },
            devnet: {
                url: 'https://api.devnet.solana.com',
                name: 'Devnet',
                explorer: 'https://solscan.io/?cluster=devnet',
            },
        },
        walletType: 'phantom',
        nftStandard: 'Metaplex Core',
        isActive: true,
        isTestnetOnly: false,
        description: 'Fast, low-cost NFTs with Metaplex Core and Candy Machine support',
    },

    xrpl: {
        id: 'xrpl',
        name: 'XRP Ledger',
        symbol: 'XRP',
        iconName: 'xrp',
        color: '#23292F',
        theme: {
            primaryColor: '#2563EB',
            secondaryColor: '#00AAE4',
            background: 'from-[#020617] via-[#0f172a] to-[#1e293b]',
            cardBorder: '#2563EB40',
            glowColor: '#00AAE4',
            buttonGradient: 'from-[#2563EB] to-[#00AAE4]',
        },
        walletLabels: {
            connect: 'Connect XUMM',
            disconnect: 'Disconnect XUMM',
            connecting: 'Connecting to XUMM...',
        },
        networks: {
            mainnet: {
                url: 'wss://xrplcluster.com',
                name: 'Mainnet',
                explorer: 'https://livenet.xrpl.org',
            },
            testnet: {
                url: 'wss://s.altnet.rippletest.net:51233',
                name: 'Testnet',
                explorer: 'https://testnet.xrpl.org',
            },
            devnet: {
                url: 'wss://s.devnet.rippletest.net:51233',
                name: 'Devnet',
                explorer: 'https://devnet.xrpl.org',
            },
        },
        walletType: 'xrpl',
        nftStandard: 'XLS-20 NFT',
        isActive: true,
        isTestnetOnly: false,
        description: 'Native NFTs on the XRP Ledger with low fees and fast finality',
    },

    monad: {
        id: 'monad',
        name: 'Monad',
        symbol: 'MON',
        iconName: 'monad',
        color: '#836EF9',
        theme: {
            primaryColor: '#A855F7',
            secondaryColor: '#F59E0B',
            background: 'from-[#1e1b4b] via-[#312e81] to-[#4c1d95]',
            cardBorder: '#A855F740',
            glowColor: '#A855F7',
            buttonGradient: 'from-[#A855F7] to-[#F59E0B]',
        },
        walletLabels: {
            connect: 'Connect Wallet',
            disconnect: 'Disconnect Wallet',
            connecting: 'Connecting to Monad...',
        },
        networks: {
            mainnet: {
                url: 'https://rpc.monad.xyz',
                name: 'Mainnet',
                chainId: 41455,
                explorer: 'https://explorer.monad.xyz',
            },
            testnet: {
                url: 'https://testnet.monad.xyz/v1',
                name: 'Testnet',
                chainId: 41454,
                explorer: 'https://testnet.explorer.monad.xyz',
            },
        },
        walletType: 'evm',
        nftStandard: 'ERC-721',
        isActive: true,
        isTestnetOnly: true, // Monad is still in testnet
        description: 'High-performance EVM-compatible chain with parallel execution',
    },
};

// Get active chains for UI
export function getActiveChains(): ChainConfig[] {
    return Object.values(CHAINS).filter(chain => chain.isActive);
}

// Get chain by ID
export function getChainConfig(chainId: SupportedChain): ChainConfig {
    return CHAINS[chainId];
}

// Get chain display name with network
export function getChainDisplayName(chainId: SupportedChain, network: 'mainnet' | 'testnet' | 'devnet' = 'mainnet'): string {
    const chain = CHAINS[chainId];
    const networkConfig = chain.networks[network] || chain.networks.testnet;
    return `${chain.name} ${networkConfig.name}`;
}

// Get explorer URL for a transaction or address
export function getExplorerUrl(
    chainId: SupportedChain,
    hash: string,
    type: 'tx' | 'address' | 'nft' = 'tx',
    network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'
): string {
    const chain = CHAINS[chainId];
    const networkConfig = chain.networks[network] || chain.networks.testnet;
    const baseUrl = networkConfig.explorer;

    switch (chainId) {
        case 'solana':
            return type === 'tx'
                ? `${baseUrl}/tx/${hash}`
                : `${baseUrl}/account/${hash}`;
        case 'xrpl':
            return type === 'tx'
                ? `${baseUrl}/transactions/${hash}`
                : type === 'nft'
                    ? `${baseUrl}/nft/${hash}`
                    : `${baseUrl}/accounts/${hash}`;
        case 'monad':
            return type === 'tx'
                ? `${baseUrl}/tx/${hash}`
                : `${baseUrl}/address/${hash}`;
        default:
            return baseUrl;
    }
}

// Default chain for new users
export const DEFAULT_CHAIN: SupportedChain = 'solana';

// Storage key for persisting chain selection
export const CHAIN_STORAGE_KEY = 'launchpad-selected-chain';

// Get stored chain or default
export function getStoredChain(): SupportedChain {
    if (typeof window === 'undefined') return DEFAULT_CHAIN;
    const stored = localStorage.getItem(CHAIN_STORAGE_KEY);
    if (stored && stored in CHAINS) {
        return stored as SupportedChain;
    }
    return DEFAULT_CHAIN;
}

// Store chain selection
export function setStoredChain(chain: SupportedChain): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(CHAIN_STORAGE_KEY, chain);
    }
}

/**
 * Get the single correct DB chain value for a chain + network pair.
 * Use this when *writing* to the DB (insert / update).
 *
 * Solana uses "devnet", XRPL and Monad use "testnet" – this
 * mirrors the actual network names used by each chain.
 */
export function getDbChainValue(
    chain: SupportedChain,
    network: 'mainnet' | 'testnet' = 'testnet'
): string {
    if (network === 'mainnet') return chain; // e.g. 'xrpl'
    // Solana historically uses "devnet" for its test environment
    if (chain === 'solana') return 'solana-devnet';
    // XRPL and Monad use "testnet"
    return `${chain}-testnet`;
}

/**
 * Get ALL DB chain values that should match a given chain when *reading*.
 * Includes both '-testnet' and '-devnet' aliases so that collections
 * saved with either naming convention are found.
 */
export function getDbChainValues(chain: SupportedChain): string[] {
    switch (chain) {
        case 'solana':
            return ['solana', 'solana-devnet', 'solana-mainnet'];
        case 'xrpl':
            return ['xrpl', 'xrpl-testnet', 'xrpl-devnet', 'xrpl-mainnet'];
        case 'monad':
            return ['monad', 'monad-testnet', 'monad-devnet', 'monad-mainnet'];
        default:
            return ['solana'];
    }
}
