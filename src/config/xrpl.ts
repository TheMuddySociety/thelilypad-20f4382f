/**
 * XRPL Network Configuration
 * Supports mainnet, testnet, and devnet for XRP Ledger NFT operations
 */

// WebSocket endpoints for XRPL nodes
export const XRPL_NETWORKS = {
    mainnet: {
        url: 'wss://xrplcluster.com',
        explorer: 'https://livenet.xrpl.org',
        name: 'Mainnet',
    },
    testnet: {
        url: 'wss://s.altnet.rippletest.net:51233',
        explorer: 'https://testnet.xrpl.org',
        name: 'Testnet',
    },
    devnet: {
        url: 'wss://s.devnet.rippletest.net:51233',
        explorer: 'https://devnet.xrpl.org',
        name: 'Devnet',
    },
} as const;

export type XRPLNetwork = keyof typeof XRPL_NETWORKS;

// Default network for development
export const DEFAULT_XRPL_NETWORK: XRPLNetwork =
    import.meta.env.VITE_XRPL_NETWORK as XRPLNetwork || 'testnet';

// NFT Minting Flags
export const XRPL_NFT_FLAGS = {
    tfBurnable: 0x00000001,      // Issuer can burn even if not owner
    tfOnlyXRP: 0x00000002,       // Can only be traded for XRP
    tfTrustLine: 0x00000004,     // Auto-create trust lines (deprecated)
    tfTransferable: 0x00000008,  // Can be transferred to other accounts
    tfMutable: 0x00000010,       // URI can be modified after minting
} as const;

// Fee configuration
export const XRPL_CONFIG = {
    // Transfer fee is in basis points (1 = 0.001%)
    // Max is 50000 (50%)
    maxTransferFee: 50000,
    minTransferFee: 0,

    // Reserve requirements (in drops, 1 XRP = 1,000,000 drops)
    baseReserve: 10_000_000,  // 10 XRP
    ownerReserve: 2_000_000,  // 2 XRP per owned object

    // NFTs per page
    nftsPerPage: 32,
};

/**
 * Get XRPL network URL
 */
export function getXRPLUrl(network: XRPLNetwork = DEFAULT_XRPL_NETWORK): string {
    return XRPL_NETWORKS[network].url;
}

/**
 * Get explorer URL for transaction or account
 */
export function getXRPLExplorerUrl(
    hash: string,
    type: 'tx' | 'account' | 'nft' = 'tx',
    network: XRPLNetwork = DEFAULT_XRPL_NETWORK
): string {
    const base = XRPL_NETWORKS[network].explorer;
    const paths = {
        tx: 'transactions',
        account: 'accounts',
        nft: 'nft',
    };
    return `${base}/${paths[type]}/${hash}`;
}

/**
 * Convert transfer fee percentage to basis points
 * @param percent - Percentage (0-50)
 * @returns Basis points (0-50000)
 */
export function percentToTransferFee(percent: number): number {
    return Math.floor(Math.min(50, Math.max(0, percent)) * 1000);
}

/**
 * Convert basis points to percentage
 * @param basisPoints - Basis points (0-50000)  
 * @returns Percentage (0-50)
 */
export function transferFeeToPercent(basisPoints: number): number {
    return basisPoints / 1000;
}

/**
 * Calculate NFT minting flags
 */
export function calculateNFTFlags(options: {
    burnable?: boolean;
    transferable?: boolean;
    onlyXRP?: boolean;
    mutable?: boolean;
}): number {
    let flags = 0;
    if (options.burnable) flags |= XRPL_NFT_FLAGS.tfBurnable;
    if (options.transferable) flags |= XRPL_NFT_FLAGS.tfTransferable;
    if (options.onlyXRP) flags |= XRPL_NFT_FLAGS.tfOnlyXRP;
    if (options.mutable) flags |= XRPL_NFT_FLAGS.tfMutable;
    return flags;
}
