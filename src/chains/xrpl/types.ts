/**
 * XRPL Types - Type definitions for XRPL chain operations
 */

export interface XRPLCollectionParams {
    name: string;
    symbol: string;
    description: string;
    totalSupply: number;
    baseUri?: string;
    royaltyPercent?: number;
    transferFee?: number; // 0-50000 (0-50%)
}

export interface XRPLDeployResult {
    address: string; // Issuer address
    taxon: number;
}

export interface XRPLMintItem {
    name: string;
    uri: string;
}
