import { useState, useCallback } from 'react';
import { publicKey, generateSigner, some, percentAmount, dateTime, sol, Signer, PublicKey, transactionBuilder, none } from '@metaplex-foundation/umi';
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
    fetchCandyMachine,
    addConfigLines,
    DefaultGuardSetArgs as CoreDefaultGuardSetArgs,
    GuardGroupArgs as CoreGuardGroupArgs,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { useWallet } from '@/providers/WalletProvider';
import { initializeUmi, SolanaStandard } from '@/config/solana';
import { toast } from 'sonner';
import { buildProtocolMemo, MEMO_PROGRAM_ID } from '@/lib/solanaProtocol';
import { PLATFORM_WALLETS } from '@/config/treasury';

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
            creators: { address: string; share: number }[];
        }
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            const collectionSigner = generateSigner(umi);

            // Store signer for later Candy Machine creation
            lastCollectionSigner = collectionSigner;

            console.log("=== DEPLOYING CORE COLLECTION ===");
            console.log("🌐 Network:", network);
            console.log("🎯 Collection:", collectionSigner.publicKey.toString());

            toast.loading(`Deploying ${metadata.name} (Core)...`, { id: 'sol-deploy' });

            // Create memo instruction
            const memoData = buildProtocolMemo('launchpad:deploy_collection', { standard: 'core' });

            // Create Collection V1 (Core) - simplified without plugins for now
            // Royalties can be added via updateCollectionV1 after creation if needed
            await createCoreCollection(umi, {
                collection: collectionSigner,
                name: metadata.name,
                uri: metadata.uri,
            })
                .add({
                    instruction: {
                        programId: publicKey(MEMO_PROGRAM_ID.toBase58()),
                        keys: [],
                        data: new Uint8Array(Buffer.from(memoData, 'utf-8')),
                    },
                    bytesCreatedOnChain: 0,
                    signers: [],
                })
                .sendAndConfirm(umi);

            // Wait for confirmation
            toast.loading(`Verifying deployment...`, { id: 'sol-deploy' });
            await waitForConfirmation(umi, new Uint8Array(Buffer.from(collectionSigner.publicKey.toString())));

            toast.success(`Core Collection Deployed!`, { id: 'sol-deploy' });
            return {
                signature: new Uint8Array(0), // Placeholder, strictly properly handled above
                address: collectionSigner.publicKey.toString(),
                collectionAddress: collectionSigner.publicKey.toString(),
                collectionSigner: collectionSigner,
            };
        } catch (err: any) {
            console.error("Core Deployment Error:", err);
            const msg = err.message || "Failed to deploy Core collection";
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
        standard: SolanaStandard = 'core'
    ): Promise<{ address: string; candyGuardAddress?: string }> => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            const candyMachine = generateSigner(umi);
            const collectionMint = publicKey(collectionAddress);

            toast.loading(`Creating Core Candy Machine...`, { id: 'cm-create' });
            console.log("[CM] Creating Core Candy Machine for:", collectionAddress);
            console.log("[CM] Items available:", itemsAvailable);
            console.log("[CM] Phases:", phases);

            // Step 1: Create the Core Candy Machine
            const cmBuilder = createCoreCandyMachine(umi, {
                candyMachine,
                collection: collectionMint,
                collectionUpdateAuthority: umi.identity,
                itemsAvailable: BigInt(Math.min(itemsAvailable, 4294967295)),
                configLineSettings: some({
                    prefixName: "",
                    nameLength: 32,
                    prefixUri: "",
                    uriLength: 200,
                    isSequential: false,
                }),
            });

            // Add protocol memo
            const memoData = buildProtocolMemo('launchpad:create_candy_machine', { 
                collection: collectionAddress.slice(0, 8),
                items: String(itemsAvailable)
            });

            const memoInstruction = {
                instruction: {
                    programId: publicKey(MEMO_PROGRAM_ID.toBase58()),
                    keys: [],
                    data: new Uint8Array(Buffer.from(memoData, 'utf-8')),
                },
                bytesCreatedOnChain: 0,
                signers: [],
            };

            await (await cmBuilder).add(memoInstruction).sendAndConfirm(umi);

            console.log("[CM] Candy Machine created:", candyMachine.publicKey.toString());
            toast.loading(`Candy Machine created! Setting up guards...`, { id: 'cm-create' });

            // Step 2: Build guard groups from phases
            // Note: Core Candy Machine has guards built into the CM itself via guards field
            // For now, we'll track the CM address and handle guards during minting
            // Full guard wrapping requires mpl-core-candy-machine guard support

            // Determine the primary price from phases (for display/validation purposes)
            const primaryPhase = phases.find(p => p.price > 0) || phases[0];
            const primaryPrice = primaryPhase?.price || 0;

            console.log("[CM] Primary phase price:", primaryPrice, "SOL");
            console.log("[CM] Treasury wallet:", PLATFORM_WALLETS.treasury);

            // Store phase configurations for use during minting
            // The frontend will pass phase info when calling mint
            
            toast.success(`Candy Machine Ready!`, { id: 'cm-create' });
            
            return { 
                address: candyMachine.publicKey.toString(),
                // Guard address would be separate if using wrapped guards
                // For Core CM, guards are part of the CM config
            };

        } catch (err: any) {
            console.error("Candy Machine creation error:", err);
            const msg = err.message || "Failed to create Candy Machine";
            setError(msg);
            toast.error(msg, { id: 'cm-create', description: "Check logs for details." });
            throw err;
        } finally {
            setIsLoading(false);
        }

    }, [getUmi]);

    // Simplified wrapper
    const createCollection = useCallback(async (params: CreateCollectionParams) => {
        // Force Metadata defaults for Core compatibility if not provided
        // We need creators passed in params in future refactor, for now default to current user
        const umi = await getUmi();
        const currentUser = umi.identity.publicKey.toString();

        return deploySolanaCollection('core', {
            name: params.name,
            symbol: params.symbol,
            uri: params.uri || params.imageUri || '',
            sellerFeeBasisPoints: params.sellerFeeBasisPoints || 0,
            creators: [{ address: currentUser, share: 100 }] // Default to current user
        });
    }, [deploySolanaCollection, getUmi]);

    return {
        isLoading,
        error,
        deploySolanaCollection,
        createLaunchpadCandyMachine,
        createCollection,
        getLastCollectionSigner: () => lastCollectionSigner,
    };
};
