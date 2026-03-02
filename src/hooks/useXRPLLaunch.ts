import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Wallet } from 'xrpl';
import {
    deployXRPLCollection as deployXRPLCollectionChain,
    mintXRPLItems as mintXRPLItemsChain,
    XRPLCollectionParams,
    XRPLDeployResult,
    XRPLMintResult,
    createXRPLClient,
    disconnectXRPLClient,
} from '@/chains';
import { loadXRPLWallet, getXRPLNetwork } from '@/lib/xrpl-wallet';

/**
 * useXRPLLaunch - React adapter for XRPL chain operations
 *
 * Loads the stored XRPL wallet + creates a live xrpl.js Client,
 * then delegates to the centralized chains/xrpl/* modules.
 *
 * FIX: mintXRPLItems now returns XRPLMintResult[] (real NFTokenIDs) instead of boolean.
 */
export function useXRPLLaunch() {
    const [isDeploying, setIsDeploying] = useState(false);
    const [isMinting, setIsMinting] = useState(false);

    /**
     * Deploy XRPL collection: sets Account Domain on ledger.
     * Connects to the ledger using the stored wallet.
     */
    const deployXRPLCollection = useCallback(async (
        params: XRPLCollectionParams
    ): Promise<XRPLDeployResult> => {
        setIsDeploying(true);
        let client: Awaited<ReturnType<typeof createXRPLClient>> | null = null;
        try {
            toast.loading(`Deploying XRPL Collection...`, { id: 'xrpl-deploy' });

            const storedWallet = await loadXRPLWallet();
            if (!storedWallet) {
                throw new Error('No XRPL wallet found. Please generate or import a wallet first.');
            }

            const network = getXRPLNetwork();
            client = await createXRPLClient(network);
            const wallet = Wallet.fromSeed(storedWallet.seed);

            const result = await deployXRPLCollectionChain(params, client, wallet);

            toast.success(`XRPL Collection deployed!`, { id: 'xrpl-deploy' });
            return result;
        } catch (err: any) {
            console.error('XRPL deployment error:', err);
            toast.error(err.message || 'Failed to deploy XRPL collection', { id: 'xrpl-deploy' });
            throw err;
        } finally {
            if (client) {
                try { await disconnectXRPLClient(client); } catch { /* ignore */ }
            }
            setIsDeploying(false);
        }
    }, []);

    /**
     * Batch-mint XRPL NFTs using the stored wallet.
     * Uses parallel Ticket-based minting for collections > 5 items.
     *
     * @param transferFee  0-50000 (0.000% – 50.000%), default 0
     * @param flags        NFTokenFlag bitfield, default 8 (tfTransferable)
     * @param issuer       Authorized minter — sets the Issuer field when minting on behalf of another account
     * @returns Array of { nfTokenId, txHash } for each minted NFT
     */
    const mintItems = useCallback(async (
        issuerAddress: string,
        taxon: number,
        items: { name: string; uri: string }[],
        transferFee: number = 0,
        flags: number = 8,         // default: tfTransferable
        issuer?: string,
    ): Promise<XRPLMintResult[]> => {
        // XRPL enforces TransferFee 0-50000 (0%–50%)
        if (transferFee < 0 || transferFee > 50000) {
            toast.error(`Invalid royalty: ${(transferFee / 1000).toFixed(1)}%. XRPL max is 50%.`);
            return [];
        }
        setIsMinting(true);
        let client: Awaited<ReturnType<typeof createXRPLClient>> | null = null;
        try {
            toast.loading(`Minting ${items.length} XRPL NFTs...`, { id: 'xrpl-mint' });

            const storedWallet = await loadXRPLWallet();
            if (!storedWallet) {
                throw new Error('No XRPL wallet found. Please generate or import a wallet first.');
            }

            const network = getXRPLNetwork();
            client = await createXRPLClient(network);
            const wallet = Wallet.fromSeed(storedWallet.seed);

            const results = await mintXRPLItemsChain(
                issuerAddress, taxon, items, client, wallet, transferFee, flags, issuer
            );

            toast.success(`XRPL NFTs minted!`, { id: 'xrpl-mint' });
            return results;
        } catch (err: any) {
            console.error('XRPL minting error:', err);
            toast.error(err.message || 'Failed to mint XRPL NFTs', { id: 'xrpl-mint' });
            return [];
        } finally {
            if (client) {
                try { await disconnectXRPLClient(client); } catch { /* ignore */ }
            }
            setIsMinting(false);
        }
    }, []);

    return {
        deployXRPLCollection,
        mintXRPLItems: mintItems,
        isDeploying,
        isMinting,
    };
}
