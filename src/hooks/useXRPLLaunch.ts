/**
 * useXRPLLaunch - Wrapper hook for XRPL NFT launching
 * 
 * Provides a consistent interface matching useSolanaLaunch for multi-chain support
 */

import { useState, useCallback } from 'react';
import { useXRPLWallet } from '@/providers/XRPLWalletProvider';
import { useXRPLMint } from './useXRPLMint';
import { useXRPLCollection } from './useXRPLCollection';
import { toast } from 'sonner';

export interface XRPLCollectionParams {
    name: string;
    symbol: string;
    description?: string;
    imageUri?: string;
    totalSupply: number;
    royaltyBasisPoints?: number;
    transferFee?: number;
    burnable?: boolean;
    transferable?: boolean;
    onlyXRP?: boolean;
    metadataBaseUri?: string;
    metadataStrategy?: 'uri' | 'domain';
}

export interface XRPLMintResult {
    success: boolean;
    taxon?: number;
    nftIds?: string[];
    error?: string;
}

export function useXRPLLaunch() {
    const { wallet, network, isConnected, address } = useXRPLWallet();
    const { mintNFT, batchMintNFTs, isMinting, progress } = useXRPLMint(network);
    const { generateTaxon } = useXRPLCollection(network);

    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Create a collection on XRPL
     * Note: XRPL doesn't have separate collection creation - a "collection" is just
     * a group of NFTs with the same taxon ID minted by the same issuer
     */
    const createCollection = useCallback(async (
        params: XRPLCollectionParams
    ): Promise<XRPLMintResult> => {
        if (!isConnected || !wallet) {
            const error = 'Please connect your XRP wallet first';
            toast.error(error);
            return { success: false, error };
        }

        setIsCreating(true);
        setError(null);

        try {
            // Generate unique taxon for this collection
            const taxon = generateTaxon();

            // For XRPL, we return the taxon - actual minting happens separately
            // or immediately if they want to pre-mint
            toast.success(`Collection prepared with taxon #${taxon}`);

            return {
                success: true,
                taxon,
            };
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to create collection';
            setError(errorMessage);
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsCreating(false);
        }
    }, [isConnected, wallet, generateTaxon]);

    /**
     * Deploy and mint all NFTs for a collection
     */
    const deployCollection = useCallback(async (
        params: XRPLCollectionParams
    ): Promise<XRPLMintResult> => {
        if (!isConnected || !wallet) {
            const error = 'Please connect your XRP wallet first';
            toast.error(error);
            return { success: false, error };
        }

        setIsCreating(true);
        setError(null);

        try {
            const taxon = generateTaxon();

            // Generate URIs if using URI strategy
            let uris: string[] | undefined;
            if (params.metadataStrategy === 'uri' && params.metadataBaseUri) {
                if (params.metadataBaseUri.endsWith('/')) {
                    uris = Array.from(
                        { length: params.totalSupply },
                        (_, i) => `${params.metadataBaseUri}${i + 1}.json`
                    );
                } else {
                    uris = Array.from(
                        { length: params.totalSupply },
                        () => params.metadataBaseUri!
                    );
                }
            }

            // Batch mint all NFTs
            const results = await batchMintNFTs(wallet as any, {
                uri: params.metadataStrategy === 'uri' ? params.metadataBaseUri : undefined,
                uris,
                count: params.totalSupply,
                taxon,
                transferFeePercent: params.transferFee || 5,
                burnable: params.burnable ?? true,
                transferable: params.transferable ?? true,
                onlyXRP: params.onlyXRP ?? true,
            });

            const mintedIds = results
                .filter(r => r.success && r.nftId)
                .map(r => r.nftId!);

            if (mintedIds.length > 0) {
                toast.success(`Minted ${mintedIds.length} NFTs!`);
                return {
                    success: true,
                    taxon,
                    nftIds: mintedIds,
                };
            } else {
                throw new Error('No NFTs were minted');
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to deploy collection';
            setError(errorMessage);
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsCreating(false);
        }
    }, [isConnected, wallet, generateTaxon, batchMintNFTs]);

    return {
        createCollection,
        deployCollection,
        isCreating: isCreating || isMinting,
        progress,
        error,
        // Expose wallet connection status
        isConnected,
        address,
    };
}

export default useXRPLLaunch;
