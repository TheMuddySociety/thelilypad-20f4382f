import { useState, useCallback } from 'react';
import { useXRPLClient } from './useXRPLClient';
import { XRPLNetwork, DEFAULT_XRPL_NETWORK } from '@/config/xrpl';

interface XRPLNFToken {
    NFTokenID: string;
    URI?: string;
    Flags: number;
    Issuer: string;
    NFTokenTaxon: number;
    TransferFee: number;
    nft_serial: number;
}

interface CollectionInfo {
    taxon: number;
    issuer: string;
    nfts: XRPLNFToken[];
    totalMinted: number;
}

/**
 * Hook for managing XRPL NFT collections (taxon-based grouping)
 */
export function useXRPLCollection(network: XRPLNetwork = DEFAULT_XRPL_NETWORK) {
    const { getClient, getAccountNFTs } = useXRPLClient(network);
    const [isLoading, setIsLoading] = useState(false);
    const [collections, setCollections] = useState<Map<number, CollectionInfo>>(new Map());

    /**
     * Generate a unique taxon for a new collection
     * Uses current timestamp + random to ensure uniqueness
     */
    const generateTaxon = useCallback((): number => {
        // XRPL taxon is an unsigned 32-bit integer
        // Use combination of timestamp and random for uniqueness
        const timestamp = Date.now() % 0xFFFFFF; // Last 24 bits of timestamp
        const random = Math.floor(Math.random() * 256); // 8 bits of randomness
        return (timestamp << 8) | random;
    }, []);

    /**
     * Get all NFTs for an account grouped by taxon (collection)
     */
    const getCollectionsByAccount = useCallback(async (
        address: string
    ): Promise<Map<number, CollectionInfo>> => {
        setIsLoading(true);

        try {
            const nfts = await getAccountNFTs(address);
            const collectionMap = new Map<number, CollectionInfo>();

            for (const nft of nfts as XRPLNFToken[]) {
                const taxon = nft.NFTokenTaxon;

                if (!collectionMap.has(taxon)) {
                    collectionMap.set(taxon, {
                        taxon,
                        issuer: nft.Issuer,
                        nfts: [],
                        totalMinted: 0,
                    });
                }

                const collection = collectionMap.get(taxon)!;
                collection.nfts.push(nft);
                collection.totalMinted = collection.nfts.length;
            }

            setCollections(collectionMap);
            return collectionMap;

        } catch (error) {
            console.error('Failed to get collections:', error);
            return new Map();
        } finally {
            setIsLoading(false);
        }
    }, [getAccountNFTs]);

    /**
     * Get NFTs by specific taxon for an account
     */
    const getNFTsByTaxon = useCallback(async (
        address: string,
        taxon: number
    ): Promise<XRPLNFToken[]> => {
        const collections = await getCollectionsByAccount(address);
        return collections.get(taxon)?.nfts || [];
    }, [getCollectionsByAccount]);

    /**
     * Decode NFT URI from hex to UTF-8
     */
    const decodeURI = useCallback((hexUri?: string): string | null => {
        if (!hexUri) return null;
        try {
            return Buffer.from(hexUri, 'hex').toString('utf-8');
        } catch {
            return null;
        }
    }, []);

    /**
     * Parse NFT metadata from URI
     */
    const fetchNFTMetadata = useCallback(async (nft: XRPLNFToken) => {
        const uri = decodeURI(nft.URI);
        if (!uri) return null;

        try {
            // Handle IPFS URLs
            let fetchUrl = uri;
            if (uri.startsWith('ipfs://')) {
                fetchUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }

            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error('Failed to fetch metadata');

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch NFT metadata:', error);
            return null;
        }
    }, [decodeURI]);

    /**
     * Check if an NFT is transferable
     */
    const isTransferable = useCallback((nft: XRPLNFToken): boolean => {
        return (nft.Flags & 0x00000008) !== 0; // tfTransferable
    }, []);

    /**
     * Check if an NFT is burnable by issuer
     */
    const isBurnable = useCallback((nft: XRPLNFToken): boolean => {
        return (nft.Flags & 0x00000001) !== 0; // tfBurnable
    }, []);

    /**
     * Get transfer fee as percentage
     */
    const getTransferFeePercent = useCallback((nft: XRPLNFToken): number => {
        return nft.TransferFee / 1000; // Convert basis points to percentage
    }, []);

    return {
        generateTaxon,
        getCollectionsByAccount,
        getNFTsByTaxon,
        decodeURI,
        fetchNFTMetadata,
        isTransferable,
        isBurnable,
        getTransferFeePercent,
        collections,
        isLoading,
        network,
    };
}
