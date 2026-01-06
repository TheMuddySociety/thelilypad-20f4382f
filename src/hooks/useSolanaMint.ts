import { useState, useCallback } from 'react';
import { publicKey, generateSigner, some, percentAmount } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import {
    createV1 as createCore,
} from '@metaplex-foundation/mpl-core';
import {
    createNft as createTokenMetadata,
    TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import {
    mintToCollectionV1 as mintBubblegum,
} from '@metaplex-foundation/mpl-bubblegum';
import { useWallet } from '@/providers/WalletProvider';
import { initializeUmi, SolanaStandard } from '@/config/solana';
import { toast } from 'sonner';

export const useSolanaMint = () => {
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

    const mintNFT = useCallback(async (
        standard: SolanaStandard,
        collectionAddress: string,
        metadata: {
            name: string;
            uri: string;
        },
        options?: {
            merkleTree?: string; // Required for Bubblegum
        }
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            let result;
            const nftSigner = generateSigner(umi);

            toast.loading(`Minting your NFT on Solana...`, { id: 'sol-mint' });

            switch (standard) {
                case 'core':
                    result = await createCore(umi, {
                        asset: nftSigner,
                        collection: publicKey(collectionAddress),
                        name: metadata.name,
                        uri: metadata.uri,
                    }).sendAndConfirm(umi);
                    break;

                case 'token-metadata':
                    result = await createTokenMetadata(umi, {
                        mint: nftSigner as any,
                        name: metadata.name,
                        uri: metadata.uri,
                        sellerFeeBasisPoints: percentAmount(0),
                        isCollection: false,
                        collection: some({ key: publicKey(collectionAddress), verified: false }),
                    }).sendAndConfirm(umi);
                    break;

                case 'bubblegum':
                    if (!options?.merkleTree) throw new Error("Merkle Tree address required for Bubblegum minting");

                    result = await mintBubblegum(umi, {
                        leafOwner: umi.identity.publicKey,
                        merkleTree: publicKey(options.merkleTree),
                        collectionMint: publicKey(collectionAddress),
                        metadata: {
                            name: metadata.name,
                            uri: metadata.uri,
                            sellerFeeBasisPoints: 0,
                            collection: some({ key: publicKey(collectionAddress), verified: false }),
                            creators: [{ address: umi.identity.publicKey, verified: true, share: 100 }],
                        },
                    }).sendAndConfirm(umi);
                    break;

                default:
                    throw new Error(`Minting for standard ${standard} not implemented`);
            }

            toast.success(`Successfully minted!`, { id: 'sol-mint' });
            return {
                signature: result.signature,
                address: nftSigner.publicKey.toString()
            };
        } catch (err: any) {
            console.error("Solana minting error:", err);
            const msg = err.message || "Failed to mint on Solana";
            setError(msg);
            toast.error(msg, { id: 'sol-mint' });
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getUmi]);

    return {
        isLoading,
        error,
        mintNFT,
    };
};
