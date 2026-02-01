import { useState, useCallback } from 'react';
import { Wallet, convertStringToHex } from 'xrpl';
import { useXRPLClient } from './useXRPLClient';
import {
    calculateNFTFlags,
    percentToTransferFee,
    getXRPLExplorerUrl,
    XRPLNetwork,
    DEFAULT_XRPL_NETWORK
} from '@/config/xrpl';
import { toast } from 'sonner';

interface MintNFTParams {
    uri?: string;                  // Metadata URI (optional for Domain strategy)
    taxon?: number;                // Collection grouping (default: 0)
    transferFeePercent?: number;   // Royalty percentage (0-50)
    burnable?: boolean;            // Can issuer burn?
    transferable?: boolean;        // Can be transferred?
    onlyXRP?: boolean;             // Trade only for XRP?
    mutable?: boolean;             // Can URI be modified?
}

interface MintResult {
    success: boolean;
    nftId?: string;
    txHash?: string;
    error?: string;
}

interface BatchMintParams extends MintNFTParams {
    count: number;                 // Number to mint
    uris?: string[];               // Optional array of URIs (one per NFT)
}

/**
 * Hook for minting NFTs on XRPL
 */
export function useXRPLMint(network: XRPLNetwork = DEFAULT_XRPL_NETWORK) {
    const { getClient, submitTransaction } = useXRPLClient(network);
    const [isMinting, setIsMinting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [lastResult, setLastResult] = useState<MintResult | null>(null);

    /**
     * Mint a single NFT
     */
    const mintNFT = useCallback(async (
        wallet: Wallet,
        params: MintNFTParams
    ): Promise<MintResult> => {
        setIsMinting(true);
        setLastResult(null);

        try {
            const client = await getClient();

            // Calculate flags
            const flags = calculateNFTFlags({
                burnable: params.burnable ?? true,
                transferable: params.transferable ?? true,
                onlyXRP: params.onlyXRP ?? true,
                mutable: params.mutable ?? false,
            });

            // Convert URI to hex (if provided)
            const uriHex = params.uri ? convertStringToHex(params.uri) : undefined;

            // Calculate transfer fee (0-50% -> 0-50000)
            const transferFee = percentToTransferFee(params.transferFeePercent ?? 0);

            // Prepare transaction
            const mintTx = {
                TransactionType: 'NFTokenMint' as const,
                Account: wallet.classicAddress,
                URI: uriHex,
                Flags: flags,
                TransferFee: transferFee,
                NFTokenTaxon: params.taxon ?? 0,
            };

            toast.loading('Minting NFT on XRPL...', { id: 'xrpl-mint' });

            // Submit and wait
            const result = await submitTransaction(mintTx, wallet);

            // Check result
            const txResult = result.result.meta?.TransactionResult;
            if (txResult !== 'tesSUCCESS') {
                throw new Error(`Transaction failed: ${txResult}`);
            }

            // Extract NFT ID from affected nodes
            const nftId = extractNFTIdFromMeta(result.result.meta);
            const txHash = result.result.hash;

            toast.success('NFT Minted!', {
                id: 'xrpl-mint',
                description: `View on explorer`,
                action: {
                    label: 'View',
                    onClick: () => window.open(getXRPLExplorerUrl(txHash, 'tx', network), '_blank'),
                },
            });

            const mintResult = { success: true, nftId, txHash };
            setLastResult(mintResult);
            return mintResult;

        } catch (error: any) {
            console.error('XRPL mint error:', error);
            toast.error('Minting failed', { id: 'xrpl-mint', description: error.message });
            const errorResult = { success: false, error: error.message };
            setLastResult(errorResult);
            return errorResult;
        } finally {
            setIsMinting(false);
        }
    }, [getClient, submitTransaction, network]);

    /**
     * Mint multiple NFTs in batch
     */
    const batchMintNFTs = useCallback(async (
        wallet: Wallet,
        params: BatchMintParams
    ): Promise<MintResult[]> => {
        setIsMinting(true);
        setProgress(0);
        const results: MintResult[] = [];

        try {
            for (let i = 0; i < params.count; i++) {
                // Use individual URI if provided, otherwise use base URI
                const uri = params.uris?.[i] ?? params.uri;

                const result = await mintNFT(wallet, {
                    ...params,
                    uri,
                });

                results.push(result);
                setProgress(((i + 1) / params.count) * 100);

                // Small delay between mints to avoid rate limiting
                if (i < params.count - 1) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            const successCount = results.filter(r => r.success).length;
            toast.success(`Minted ${successCount}/${params.count} NFTs`, { id: 'batch-mint' });

        } catch (error: any) {
            console.error('Batch mint error:', error);
            toast.error('Batch minting failed', { description: error.message });
        } finally {
            setIsMinting(false);
            setProgress(0);
        }

        return results;
    }, [mintNFT]);

    /**
     * Burn an NFT
     */
    const burnNFT = useCallback(async (
        wallet: Wallet,
        nftokenId: string
    ): Promise<MintResult> => {
        setIsMinting(true);

        try {
            toast.loading('Burning NFT...', { id: 'xrpl-burn' });

            const burnTx = {
                TransactionType: 'NFTokenBurn' as const,
                Account: wallet.classicAddress,
                NFTokenID: nftokenId,
            };

            const result = await submitTransaction(burnTx, wallet);

            const txResult = result.result.meta?.TransactionResult;
            if (txResult !== 'tesSUCCESS') {
                throw new Error(`Burn failed: ${txResult}`);
            }

            toast.success('NFT Burned!', { id: 'xrpl-burn' });
            return { success: true, txHash: result.result.hash };

        } catch (error: any) {
            console.error('XRPL burn error:', error);
            toast.error('Burn failed', { id: 'xrpl-burn', description: error.message });
            return { success: false, error: error.message };
        } finally {
            setIsMinting(false);
        }
    }, [submitTransaction]);

    return {
        mintNFT,
        batchMintNFTs,
        burnNFT,
        isMinting,
        progress,
        lastResult,
        network,
    };
}

/**
 * Extract NFT ID from transaction metadata
 */
function extractNFTIdFromMeta(meta: any): string | undefined {
    if (!meta?.AffectedNodes) return undefined;

    for (const node of meta.AffectedNodes) {
        // Look for created NFTokenPage
        if (node.CreatedNode?.LedgerEntryType === 'NFTokenPage') {
            const nfts = node.CreatedNode.NewFields?.NFTokens;
            if (nfts?.length > 0) {
                return nfts[nfts.length - 1].NFToken?.NFTokenID;
            }
        }

        // Look for modified NFTokenPage
        if (node.ModifiedNode?.LedgerEntryType === 'NFTokenPage') {
            const finalNFTs = node.ModifiedNode.FinalFields?.NFTokens;
            const previousNFTs = node.ModifiedNode.PreviousFields?.NFTokens;

            if (finalNFTs && previousNFTs) {
                // Find the new NFT (in final but not in previous)
                const previousIds = new Set(previousNFTs.map((n: any) => n.NFToken?.NFTokenID));
                const newNFT = finalNFTs.find((n: any) => !previousIds.has(n.NFToken?.NFTokenID));
                if (newNFT) {
                    return newNFT.NFToken?.NFTokenID;
                }
            }
        }
    }

    return undefined;
}
