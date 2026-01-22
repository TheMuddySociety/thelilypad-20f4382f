import { useState, useCallback } from 'react';
import { publicKey, generateSigner, some, percentAmount } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import {
    createV1 as createCore,
} from '@metaplex-foundation/mpl-core';
import {
    mintToCollectionV1 as mintBubblegum,
} from '@metaplex-foundation/mpl-bubblegum';
import {
    fetchCandyMachine,
    mintAssetFromCandyMachine,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { useWallet } from '@/providers/WalletProvider';
import { initializeUmi, SolanaStandard } from '@/config/solana';
import { toast } from 'sonner';
import { buildProtocolMemo, MEMO_PROGRAM_ID } from '@/lib/solanaProtocol';

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

            toast.loading(`Minting your NFT (Core)...`, { id: 'sol-mint' });

            // Create memo instruction for protocol identification
            const memoData = buildProtocolMemo('mint:nft', { standard });
            const memoInstruction = {
                instruction: {
                    programId: publicKey(MEMO_PROGRAM_ID.toBase58()),
                    keys: [],
                    data: new Uint8Array(Buffer.from(memoData, 'utf-8')),
                },
                bytesCreatedOnChain: 0,
                signers: [],
            };

            switch (standard) {
                case 'core':
                case 'token-metadata': // Fallback to Core for legacy requests
                    if (standard === 'token-metadata') {
                        console.warn("Legacy 'token-metadata' requested. Upgrading to 'core' automatically.");
                    }
                    result = await createCore(umi, {
                        asset: nftSigner,
                        collection: publicKey(collectionAddress),
                        name: metadata.name,
                        uri: metadata.uri,
                    })
                        .add(memoInstruction)
                        .sendAndConfirm(umi);
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
                    })
                        .add(memoInstruction)
                        .sendAndConfirm(umi);
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

    const mintFromCandyMachine = useCallback(async (
        candyMachineAddress: string,
        collectionAddress: string,
        groupLabel?: string,
        mintArgs?: any
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            const nftMint = generateSigner(umi);
            // In Core CM, we don't need 'nftMint' signer passed usually? 
            // Warning: createCoreCandyMachine mintV1 MIGHT expect 'asset' signer. Checking docs/types:
            // It typically takes 'asset' (Signer).

            toast.loading(`Minting from Candy Machine (Core)...`, { id: 'cm-mint' });

            const candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineAddress));

            // Create memo instruction for protocol identification
            const memoData = buildProtocolMemo('mint:candy_machine');
            const memoInstruction = {
                instruction: {
                    programId: publicKey(MEMO_PROGRAM_ID.toBase58()),
                    keys: [],
                    data: new Uint8Array(Buffer.from(memoData, 'utf-8')),
                },
                bytesCreatedOnChain: 0,
                signers: [],
            };

            // Use guardless mint (no Candy Guard required)
            const tx = await mintAssetFromCandyMachine(umi, {
                candyMachine: candyMachine.publicKey,
                mintAuthority: umi.identity,
                asset: nftMint,
                collection: candyMachine.collectionMint, // Use correct collection from CM state
                assetOwner: umi.identity.publicKey,
                plugins: [],
            }).add(memoInstruction);

            const result = await tx.sendAndConfirm(umi);

            toast.success(`Minted successfully!`, { id: 'cm-mint' });

            return {
                signature: result.signature,
                address: nftMint.publicKey.toString()
            };
        } catch (err: any) {
            console.error("CM mint error:", err);
            const msg = err.message || "Candy Machine mint failed";
            setError(msg);
            toast.error(msg, { id: 'cm-mint' });
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getUmi]);

    return {
        isLoading,
        error,
        mintNFT,
        mintFromCandyMachine,
    };
};
