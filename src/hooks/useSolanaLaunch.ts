import { useState, useCallback } from 'react';
import { publicKey, signerIdentity, Signer, generateSigner, some, percentAmount } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import {
    createCollection as createCoreCollection,
} from '@metaplex-foundation/mpl-core';
import {
    createNft,
    TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import {
    createTree,
} from '@metaplex-foundation/mpl-bubblegum';
import { useWallet } from '@/providers/WalletProvider';
import { initializeUmi, SolanaStandard } from '@/config/solana';
import { toast } from 'sonner';

export const useSolanaLaunch = () => {
    const { network, getSolanaProvider } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getUmi = useCallback(async () => {
        const provider = getSolanaProvider();
        if (!provider || !provider.publicKey) {
            throw new Error("Solana wallet not connected");
        }

        const umi = initializeUmi(network);

        // Wrap the Phantom provider to match the expected wallet adapter interface
        const wallet = {
            publicKey: provider.publicKey,
            signTransaction: provider.signTransaction.bind(provider),
            signAllTransactions: provider.signAllTransactions.bind(provider),
            signMessage: provider.signMessage ? provider.signMessage.bind(provider) : undefined,
        };

        return umi.use(walletAdapterIdentity(wallet));
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
            const collectionSigner = generateSigner(umi);

            toast.loading(`Deploying ${metadata.name} on Solana...`, { id: 'sol-deploy' });

            switch (standard) {
                case 'core':
                    result = await createCoreCollection(umi, {
                        collection: collectionSigner,
                        name: metadata.name,
                        uri: metadata.uri,
                    }).sendAndConfirm(umi);
                    break;

                case 'token-metadata':
                    result = await createNft(umi, {
                        mint: collectionSigner,
                        name: metadata.name,
                        symbol: metadata.symbol,
                        uri: metadata.uri,
                        sellerFeeBasisPoints: percentAmount(metadata.sellerFeeBasisPoints / 100),
                        isCollection: true,
                    }).sendAndConfirm(umi);
                    break;

                case 'bubblegum':
                    // cNFTs require a Merkle Tree first.
                    const merkleTree = generateSigner(umi);
                    toast.info("Creating Merkle Tree for cNFTs...", { id: 'sol-deploy' });

                    await (await createTree(umi, {
                        merkleTree,
                        maxDepth: 14,
                        maxBufferSize: 64,
                        public: false,
                    })).sendAndConfirm(umi);

                    // Now create the collection NFT that will lead the tree
                    const bubblegumCollection = generateSigner(umi);
                    result = await createNft(umi, {
                        mint: bubblegumCollection,
                        name: metadata.name,
                        symbol: metadata.symbol,
                        uri: metadata.uri,
                        sellerFeeBasisPoints: percentAmount(metadata.sellerFeeBasisPoints / 100),
                        isCollection: true,
                    }).sendAndConfirm(umi);
                    break;

                default:
                    throw new Error(`Standard ${standard} not fully implemented in this preview`);
            }

            toast.success(`Successfully deployed to Solana!`, { id: 'sol-deploy' });
            return {
                signature: result?.signature,
                address: collectionSigner.publicKey.toString()
            };
        } catch (err: any) {
            console.error("Solana deployment error:", err);
            const msg = err.message || "Failed to deploy to Solana";
            setError(msg);
            toast.error(msg, { id: 'sol-deploy' });
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
