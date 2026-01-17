import { useState, useCallback } from 'react';
import { publicKey, generateSigner, some, percentAmount, dateTime, sol, Signer, PublicKey } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import {
    createCollectionV1 as createCoreCollection,
} from '@metaplex-foundation/mpl-core';
import {
    createNft,
    TokenStandard,
    findMetadataPda,
    fetchMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import {
    create,
    createCandyGuard,
    GuardGroupArgs,
    DefaultGuardSetArgs,
} from '@metaplex-foundation/mpl-candy-machine';
import {
    createCandyMachine as createCoreCandyMachine,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { useWallet } from '@/providers/WalletProvider';
import { initializeUmi, SolanaStandard } from '@/config/solana';
import { toast } from 'sonner';

// Helper to wait for transaction confirmation
const waitForConfirmation = async (umi: any, signature: Uint8Array, maxRetries = 30): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await umi.rpc.getSignatureStatuses([signature]);
            if (result[0]?.confirmationStatus === 'confirmed' || result[0]?.confirmationStatus === 'finalized') {
                return true;
            }
        } catch (e) {
            console.log(`Waiting for confirmation... attempt ${i + 1}/${maxRetries}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
};

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

            // 🔍 DEBUG LOGGING - Critical for diagnosing cluster/program mismatches
            console.log("=== DEPLOYMENT DEBUG INFO ===");
            console.log("🌐 Network:", network);
            console.log("🔗 RPC Endpoint:", umi.rpc.getEndpoint());
            console.log("👛 Wallet Address:", umi.identity.publicKey.toString());
            console.log("📦 Collection Standard:", standard);
            console.log("🎯 Collection Address (will be):", collectionSigner.publicKey.toString());
            console.log("============================");

            toast.loading(`Deploying ${metadata.name} on Solana ${network}...`, { id: 'sol-deploy' });

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

            // Wait for confirmation before returning
            if (result?.signature) {
                toast.loading(`Confirming transaction...`, { id: 'sol-deploy' });
                const confirmed = await waitForConfirmation(umi, result.signature);
                if (!confirmed) {
                    console.warn("Transaction may not be fully confirmed yet");
                }
                
                // Additional wait for state propagation
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            toast.success(`Successfully deployed collection!`, { id: 'sol-deploy' });
            return {
                signature: result?.signature,
                address: collectionSigner.publicKey.toString(),
                collectionAddress: collectionSigner.publicKey.toString(),
                collectionSigner: collectionSigner, // Return the signer for CM creation
            };
        } catch (err: any) {
            console.error("Solana deployment error:", err);

            // Try to extract logs if available
            if (err.getLogs) {
                try {
                    const logs = await err.getLogs();
                    console.error("Transaction Logs:", logs);
                } catch (e) {
                    console.error("Failed to get logs via getLogs()", e);
                }
            } else if (err.logs) {
                console.error("Transaction Logs (property):", err.logs);
            }

            let msg = err.message || "Failed to deploy to Solana";

            // Check for specific "program does not exist" error which often involves network mismatch
            if (msg.includes("Attempt to load a program that does not exist")) {
                if (network === "testnet") {
                    msg = "Deployment failed: Metaplex programs may not be available on Solana Testnet. Please switch to Devnet or Mainnet.";
                } else {
                    msg = "Deployment failed: A required program (Metaplex) does not exist on this network. Check console for logs.";
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
        },
        standard: SolanaStandard = 'token-metadata'
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            const candyMachine = generateSigner(umi);
            const collectionMint = publicKey(collectionAddress);

            toast.loading(`Verifying collection...`, { id: 'cm-create' });

            // For legacy standard, verify the collection metadata exists and we're the update authority
            if (standard === 'token-metadata') {
                const metadataPda = findMetadataPda(umi, { mint: collectionMint });
                
                try {
                    const collectionMetadata = await fetchMetadata(umi, metadataPda);
                    console.log("=== COLLECTION VERIFICATION ===");
                    console.log("Collection Mint:", collectionAddress);
                    console.log("Metadata PDA:", metadataPda[0].toString());
                    console.log("Update Authority:", collectionMetadata.updateAuthority.toString());
                    console.log("Our Identity:", umi.identity.publicKey.toString());
                    console.log("Match:", collectionMetadata.updateAuthority.toString() === umi.identity.publicKey.toString());
                    console.log("================================");
                    
                    if (collectionMetadata.updateAuthority.toString() !== umi.identity.publicKey.toString()) {
                        throw new Error(`Update authority mismatch. Collection authority: ${collectionMetadata.updateAuthority.toString()}, Your wallet: ${umi.identity.publicKey.toString()}`);
                    }
                } catch (fetchErr: any) {
                    if (fetchErr.message?.includes('Update authority mismatch')) {
                        throw fetchErr;
                    }
                    console.error("Failed to fetch collection metadata:", fetchErr);
                    // Wait a bit more and retry
                    toast.loading(`Waiting for collection confirmation...`, { id: 'cm-create' });
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

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

            let createIx;

            if (standard === 'core') {
                toast.loading(`Initializing Core Candy Machine...`, { id: 'cm-create' });
                // Use Metaplex Core Candy Machine
                createIx = await createCoreCandyMachine(umi, {
                    candyMachine,
                    collection: collectionMint,
                    collectionUpdateAuthority: umi.identity,
                    itemsAvailable,
                    configLineSettings: some({
                        prefixName: "",
                        nameLength: 32,
                        prefixUri: "",
                        uriLength: 200,
                        isSequential: false,
                    }),
                });
            } else {
                toast.loading(`Initializing Legacy Candy Machine...`, { id: 'cm-create' });
                // Use Legacy Candy Machine V3
                createIx = await create(umi, {
                    candyMachine,
                    collectionMint,
                    collectionUpdateAuthority: umi.identity,
                    tokenStandard: TokenStandard.NonFungible,
                    sellerFeeBasisPoints: percentAmount(metadata.sellerFeeBasisPoints / 100),
                    itemsAvailable,
                    creators: metadata.creators.map(c => ({
                        address: publicKey(c.address),
                        verified: c.address === umi.identity.publicKey.toString(),
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
            }

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
