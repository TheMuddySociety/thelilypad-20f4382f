import { useState, useCallback } from 'react';
import { publicKey, generateSigner, some, percentAmount, dateTime, sol, Signer } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import {
    createCollection as createCoreCollection,
} from '@metaplex-foundation/mpl-core';
import {
    createNft,
    TokenStandard,
    findMetadataPda,
} from '@metaplex-foundation/mpl-token-metadata';
import {
    create,
    GuardGroupArgs,
    DefaultGuardSetArgs,
} from '@metaplex-foundation/mpl-candy-machine';
import { useWallet } from '@/providers/WalletProvider';
import { initializeUmi, SolanaStandard } from '@/config/solana';
import { toast } from 'sonner';

export interface LaunchpadPhase {
    id: string; // group label
    price: number;
    startTime: Date | null;
    endTime: Date | null;
    merkleRoot?: string | null; // for allowlist
    maxPerWallet?: number;
}

interface CreateCollectionParams {
    name: string;
    symbol: string;
    imageUri?: string;
    uri?: string;
    royaltyBasisPoints?: number;
    sellerFeeBasisPoints?: number;
    standard?: SolanaStandard;
    supplyConfig?: {
        type: string;
        limit?: number;
    };
}

// Store collection signer for Candy Machine creation
let lastCollectionSigner: Signer | null = null;

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

            // Store signer for later Candy Machine creation
            lastCollectionSigner = collectionSigner;

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
                default:
                    // Create collection NFT with wallet as update authority
                    result = await createNft(umi, {
                        mint: collectionSigner,
                        name: metadata.name,
                        symbol: metadata.symbol,
                        uri: metadata.uri,
                        sellerFeeBasisPoints: percentAmount(metadata.sellerFeeBasisPoints / 100),
                        isCollection: true,
                        // Wallet identity becomes the update authority automatically
                    }).sendAndConfirm(umi);
                    break;
            }

            toast.success(`Successfully deployed collection!`, { id: 'sol-deploy' });
            return {
                signature: result?.signature,
                address: collectionSigner.publicKey.toString(),
                collectionAddress: collectionSigner.publicKey.toString()
            };
        } catch (err: any) {
            console.error("Solana deployment error:", err);
            let msg = err.message || "Failed to deploy to Solana";

            // Check for specific "program does not exist" error which often involves network mismatch
            if (msg.includes("Attempt to load a program that does not exist")) {
                if (network === "testnet") {
                    msg = "Deployment failed: Metaplex programs may not be available on Solana Testnet. Please switch to Devnet or Mainnet.";
                } else {
                    msg = "Deployment failed: A required program (Metaplex) does not exist on this network.";
                }
            }

            setError(msg);
            toast.error(msg, { id: 'sol-deploy' });
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [getUmi, network]);

    const createLaunchpadCandyMachine = useCallback(async (
        collectionAddress: string,
        itemsAvailable: number,
        phases: LaunchpadPhase[],
        metadata: {
            name: string;
            symbol: string;
            uri: string;
            sellerFeeBasisPoints: number;
            creators: { address: string; share: number }[];
        }
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            const candyMachine = generateSigner(umi);

            toast.loading(`Initializing Candy Machine...`, { id: 'cm-create' });

            // map phases to groups with proper guard structure
            const groups: GuardGroupArgs<DefaultGuardSetArgs>[] = phases.map(phase => {
                // Build guards object with proper Option types
                const guards: Partial<DefaultGuardSetArgs> = {};

                // Payment guard - use 'some' wrapper for Option types
                if (phase.price > 0) {
                    guards.solPayment = some({
                        lamports: sol(phase.price),
                        destination: umi.identity.publicKey
                    });
                }

                // Start date
                if (phase.startTime) {
                    guards.startDate = some({ date: dateTime(phase.startTime) });
                }

                // End date
                if (phase.endTime) {
                    guards.endDate = some({ date: dateTime(phase.endTime) });
                }

                // Allowlist (Merkle Root)
                if (phase.merkleRoot) {
                    guards.allowList = some({ merkleRoot: new Uint8Array(Buffer.from(phase.merkleRoot, 'hex')) });
                }

                // Mint limit
                if (phase.maxPerWallet) {
                    guards.mintLimit = some({ id: 1, limit: phase.maxPerWallet });
                }

                return {
                    label: phase.id,
                    guards: guards as DefaultGuardSetArgs,
                };
            });

            const collectionMint = publicKey(collectionAddress);

            // The wallet (umi.identity) must be the update authority of the collection
            // which it is since we created the collection with the same wallet
            const createIx = await create(umi, {
                candyMachine,
                collectionMint,
                collectionUpdateAuthority: umi.identity, // Wallet is the update authority
                tokenStandard: TokenStandard.NonFungible,
                sellerFeeBasisPoints: percentAmount(metadata.sellerFeeBasisPoints / 100),
                itemsAvailable,
                creators: metadata.creators.map(c => ({
                    address: publicKey(c.address),
                    verified: c.address === umi.identity.publicKey.toString(), // Only verify if it's the signer
                    percentageShare: c.share
                })),
                configLineSettings: some({
                    prefixName: "",
                    nameLength: 32,
                    prefixUri: "",
                    uriLength: 200,
                    isSequential: false,
                }),
                groups: groups.length > 0 ? groups : undefined,
            });

            await createIx.sendAndConfirm(umi);

            toast.success(`Candy Machine created!`, { id: 'cm-create' });

            return {
                address: candyMachine.publicKey.toString()
            };

        } catch (err: any) {
            console.error("Candy Machine creation error:", err);
            // Extract more detailed error info
            let msg = err.message || "Failed to create Candy Machine";
            if (err.logs) {
                console.error("Transaction logs:", err.logs);
            }
            setError(msg);
            toast.error(msg, { id: 'cm-create' });
            throw err;
        } finally {
            setIsLoading(false);
        }

    }, [getUmi]);

    // Simplified createCollection for backward compatibility
    const createCollection = useCallback(async (params: CreateCollectionParams) => {
        const uri = params.uri || params.imageUri || '';
        const sellerFeeBasisPoints = params.sellerFeeBasisPoints || params.royaltyBasisPoints || 0;
        const standard = params.standard || 'token-metadata'; // Default to token-metadata for CM compatibility

        return deploySolanaCollection(standard, {
            name: params.name,
            symbol: params.symbol,
            uri,
            sellerFeeBasisPoints
        });
    }, [deploySolanaCollection]);

    return {
        isLoading,
        error,
        deploySolanaCollection,
        createLaunchpadCandyMachine,
        createCollection,
        getLastCollectionSigner: () => lastCollectionSigner,
    };
};
