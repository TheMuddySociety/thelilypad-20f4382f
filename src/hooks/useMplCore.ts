import { useMemo } from 'react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplCore, create, fetchAsset, fetchCollection } from '@metaplex-foundation/mpl-core';
import { useWallet } from '@/providers/WalletProvider';
import { getSolanaRpcUrl } from '@/config/solana';
import { PublicKey, generateSigner, publicKey } from '@metaplex-foundation/umi';
import { toast } from 'sonner';

export interface CreateNftParams {
    name: string;
    uri: string;
}

export const useMplCore = () => {
    const { network, getSolanaProvider } = useWallet();

    const umi = useMemo(() => {
        const rpcUrl = getSolanaRpcUrl(network);
        const umiInstance = createUmi(rpcUrl).use(mplCore());

        const provider = getSolanaProvider();
        if (provider) {
            umiInstance.use(walletAdapterIdentity(provider));
        }

        return umiInstance;
    }, [network, getSolanaProvider]);

    const createCoreNft = async ({ name, uri }: CreateNftParams) => {
        try {
            if (!umi.identity.publicKey) {
                throw new Error("Wallet not connected");
            }

            const asset = generateSigner(umi);

            const transaction = create(umi, {
                asset,
                name,
                uri,
            });

            const result = await transaction.sendAndConfirm(umi);

            return { signature: result.signature, assetAddress: asset.publicKey };
        } catch (error) {
            console.error("Error creating NFT:", error);
            throw error;
        }
    };

    const fetchCoreAsset = async (assetAddress: string) => {
        try {
            const assetPubkey = publicKey(assetAddress);
            const asset = await fetchAsset(umi, assetPubkey);
            return asset;
        } catch (error) {
            console.error("Error fetching asset:", error);
            throw error;
        }
    };

    const fetchCoreCollection = async (collectionAddress: string) => {
        try {
            const collectionPubkey = publicKey(collectionAddress);
            const collection = await fetchCollection(umi, collectionPubkey);
            return collection;
        } catch (error) {
            console.error("Error fetching collection:", error);
            throw error;
        }
    };

    return { umi, createCoreNft, fetchCoreAsset, fetchCoreCollection };
};
