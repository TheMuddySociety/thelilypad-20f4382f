import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
    deployXRPLCollection,
    mintXRPLItems,
    XRPLCollectionParams,
    XRPLDeployResult
} from '@/chains';

/**
 * useXRPLLaunch - Thin React adapter for XRPL chain operations
 *
 * This hook provides React state management and delegates all chain logic
 * to the centralized chains/xrpl/* modules.
 */

export function useXRPLLaunch() {
    const [isDeploying, setIsDeploying] = useState(false);
    const [isMinting, setIsMinting] = useState(false);

    /**
     * Deploy XRPL collection with Account Domain strategy
     */
    const deployXRPLCollection = useCallback(async (
        params: XRPLCollectionParams
    ): Promise<XRPLDeployResult> => {
        setIsDeploying(true);
        try {
            toast.loading(`Deploying XRPL Collection...`, { id: 'xrpl-deploy' });

            const result = await deployXRPLCollection(params);

            toast.success(`XRPL Collection deployed!`, { id: 'xrpl-deploy' });
            return result;
        } catch (err: any) {
            console.error('XRPL deployment error:', err);
            toast.error(err.message || 'Failed to deploy XRPL collection', { id: 'xrpl-deploy' });
            throw err;
        } finally {
            setIsDeploying(false);
        }
    }, []);

    /**
     * Mint XRPL NFTs
     */
    const mintXRPLItems = useCallback(async (
        issuerAddress: string,
        taxon: number,
        items: { name: string; uri: string }[]
    ): Promise<boolean> => {
        setIsMinting(true);
        try {
            toast.loading(`Minting ${items.length} XRPL NFTs...`, { id: 'xrpl-mint' });

            const result = await mintXRPLItems(issuerAddress, taxon, items);

            toast.success(`XRPL NFTs minted!`, { id: 'xrpl-mint' });
            return result;
        } catch (err: any) {
            console.error('XRPL minting error:', err);
            toast.error(err.message || 'Failed to mint XRPL NFTs', { id: 'xrpl-mint' });
            return false;
        } finally {
            setIsMinting(false);
        }
    }, []);

    return {
        deployXRPLCollection,
        mintXRPLItems,
        isDeploying,
        isMinting,
    };
}
