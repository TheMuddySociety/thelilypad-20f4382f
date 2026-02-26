import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Wallet } from 'xrpl';
import {
    deployXRPLCollection as deployXRPLCollectionChain,
    mintXRPLItems as mintXRPLItemsChain,
    XRPLCollectionParams,
    XRPLDeployResult,
    createXRPLClient,
    disconnectXRPLClient,
} from '@/chains';
import { loadXRPLWallet, getXRPLNetwork } from '@/lib/xrpl-wallet';

/**
 * useXRPLLaunch - React adapter for XRPL chain operations
 *
 * Loads the stored XRPL wallet + creates a live xrpl.js Client,
 * then delegates to the centralized chains/xrpl/* modules.
 */

export function useXRPLLaunch() {
    const [isDeploying, setIsDeploying] = useState(false);
    const [isMinting, setIsMinting] = useState(false);

    /**
     * Deploy XRPL collection with Account Domain strategy.
     * Connects to the ledger using the stored wallet.
     */
    const deployXRPLCollection = useCallback(async (
        params: XRPLCollectionParams
    ): Promise<XRPLDeployResult> => {
        setIsDeploying(true);
        let client: Awaited<ReturnType<typeof createXRPLClient>> | null = null;
        try {
            toast.loading(`Deploying XRPL Collection...`, { id: 'xrpl-deploy' });

            const storedWallet = loadXRPLWallet();
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
     * Mint XRPL NFTs using the stored wallet.
     * @param transferFee  0-50000 (0.000% – 50.000%), default 0
     */
    const mintItems = useCallback(async (
        issuerAddress: string,
        taxon: number,
        items: { name: string; uri: string }[],
        transferFee: number = 0,
    ): Promise<boolean> => {
        setIsMinting(true);
        let client: Awaited<ReturnType<typeof createXRPLClient>> | null = null;
        try {
            toast.loading(`Minting ${items.length} XRPL NFTs...`, { id: 'xrpl-mint' });

            const storedWallet = loadXRPLWallet();
            if (!storedWallet) {
                throw new Error('No XRPL wallet found. Please generate or import a wallet first.');
            }

            const network = getXRPLNetwork();
            client = await createXRPLClient(network);
            const wallet = Wallet.fromSeed(storedWallet.seed);

            const result = await mintXRPLItemsChain(
                issuerAddress, taxon, items, client, wallet, transferFee
            );

            toast.success(`XRPL NFTs minted!`, { id: 'xrpl-mint' });
            return result;
        } catch (err: any) {
            console.error('XRPL minting error:', err);
            toast.error(err.message || 'Failed to mint XRPL NFTs', { id: 'xrpl-mint' });
            return false;
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
