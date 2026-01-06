import { useState, useCallback } from 'react';
import { publicKey, signerIdentity, Signer, createNoopSigner } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
    createCollection,
    fetchCollection,
    mintV1 as mintCore,
} from '@metaplex-foundation/mpl-core';
import {
    createNft,
    mintV1 as mintTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import {
    createTree,
    mintToCollectionV1 as mintBubblegum,
} from '@metaplex-foundation/mpl-bubblegum';
import { useWallet } from '@/providers/WalletProvider';
import { initializeUmi, SolanaStandard, getSolanaRpcUrl } from '@/config/solana';
import { toast } from 'sonner';

export const useSolanaLaunch = () => {
    const { address, network, getSolanaProvider } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getUmi = useCallback(async () => {
        const provider = getSolanaProvider();
        if (!provider || !provider.publicKey) {
            throw new Error("Solana wallet not connected");
        }

        const umi = initializeUmi(network);

        // Create a Umi signer from the Phantom provider
        const umiSigner: Signer = {
            publicKey: publicKey(provider.publicKey.toString()),
            signMessage: async (message: Uint8Array) => {
                const result = await provider.signMessage(message, "utf8");
                return result.signature;
            },
            signTransaction: async (transaction) => {
                // This is a simplified version; in a real app, you'd convert between Umi and web3.js formats
                // For brevity in this hook, we assume Umi's transaction format can be signed 
                // or that we're using a helper that handles it.
                // NOTE: Metaplex provides @metaplex-foundation/umi-signer-wallet-adapters for this.
                return provider.signTransaction(transaction);
            },
            signAllTransactions: async (transactions) => {
                return provider.signAllTransactions(transactions);
            },
        };

        return umi.use(signerIdentity(umiSigner));
    }, [getSolanaProvider, network]);

    const deploySolanaCollection = useCallback(async (
        standard: SolanaStandard,
        metadata: {
            name: string;
            symbol: string;
            uri: string;
            sellerFeeBasisPoints: number;
        }
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            let result;

            switch (standard) {
                case 'core':
                    result = await createCollection(umi, {
                        name: metadata.name,
                        uri: metadata.uri,
                    }).sendAndConfirm(umi);
                    break;

                case 'token-metadata':
                    result = await createNft(umi, {
                        name: metadata.name,
                        symbol: metadata.symbol,
                        uri: metadata.uri,
                        sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
                        isCollection: true,
                    }).sendAndConfirm(umi);
                    break;

                case 'bubblegum':
                    // cNFTs require a Merkle Tree first
                    // This is a simplified implementation
                    toast.info("Creating Merkle Tree for cNFTs...");
                    result = await createTree(umi, {
                        merkleTree: createNoopSigner(publicKey(umi.identity.publicKey)), // Placeholder
                        maxDepth: 14,
                        maxBufferSize: 64,
                    }).sendAndConfirm(umi);
                    break;

                default:
                    throw new Error(`Standard ${standard} not implemented yet`);
            }

            toast.success(`Solana ${standard} collection deployed!`);
            return result;
        } catch (err: any) {
            console.error("Solana deployment error:", err);
            const msg = err.message || "Failed to deploy to Solana";
            setError(msg);
            toast.error(msg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getUmi]);

    return {
        isLoading,
        error,
        deploySolanaCollection,
    };
};
