import { useState, useCallback } from 'react';
import { publicKey } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { transferV1 } from '@metaplex-foundation/mpl-core';
import { useWallet } from '@/providers/WalletProvider';
import { initializeUmi } from '@/config/solana';
import { toast } from 'sonner';

export const useSolanaCoreTransfer = () => {
    const { network, getSolanaProvider } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getUmi = useCallback(async () => {
        const provider = getSolanaProvider();
        if (!provider || !provider.publicKey) {
            throw new Error("Solana wallet not connected");
        }

        const umi = initializeUmi(network);
        const wallet = {
            publicKey: provider.publicKey,
            signTransaction: provider.signTransaction.bind(provider),
            signAllTransactions: provider.signAllTransactions.bind(provider),
            signMessage: provider.signMessage ? provider.signMessage.bind(provider) : undefined,
        };

        return umi.use(walletAdapterIdentity(wallet));
    }, [getSolanaProvider, network]);

    const transferAsset = useCallback(async (
        assetAddress: string,
        newOwnerAddress: string,
        options?: {
            collectionAddress?: string; // Optional context
        }
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();

            toast.loading(`Processing transfer...`, { id: 'sol-transfer' });

            // Core Transfer V1
            // Requires the current owner (asset owner) to be a signer.
            // If the current user (umi.identity) is NOT the owner, this will fail unless 
            // the user has delegate authority.

            const result = await transferV1(umi, {
                asset: publicKey(assetAddress),
                newOwner: publicKey(newOwnerAddress),
                collection: options?.collectionAddress ? publicKey(options.collectionAddress) : undefined,
            }).sendAndConfirm(umi);

            toast.success(`Transfer successful!`, { id: 'sol-transfer' });
            return {
                signature: result.signature,
                success: true
            };
        } catch (err: any) {
            console.error("Solana transfer error:", err);
            const msg = err.message || "Failed to transfer asset";

            // Helpful error handling for P2P mismatch
            if (msg.includes("Signature verification failed") || msg.includes("PrivilegeEscalation")) {
                setError("Transfer failed: You are not the owner of this asset.");
                toast.error("Transfer failed: You must own the asset to transfer it.", { id: 'sol-transfer' });
            } else {
                setError(msg);
                toast.error(msg, { id: 'sol-transfer' });
            }
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getUmi]);

    return {
        isLoading,
        error,
        transferAsset,
    };
};
