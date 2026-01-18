import { useState, useCallback } from 'react';
import { publicKey, generateSigner, some, percentAmount, dateTime, sol, Signer, PublicKey, transactionBuilder } from '@metaplex-foundation/umi';
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
import { buildProtocolMemo, MEMO_PROGRAM_ID } from '@/lib/solanaProtocol';

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

            // Check for Metaplex programs availability
            const MPL_CORE_ID = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d';
            const MPL_CM_ID = 'CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR';
            // Core Candy Machine often uses a different ID or the same, let's verify connectivity
            try {
                const balance = await umi.rpc.getBalance(umi.identity.publicKey);
                console.log("💰 Wallet Balance:", Number(balance.basisPoints) / 1e9, "SOL");

                // Helper to check program
                const checkProgram = async (id: string, name: string) => {
                    const info = await umi.rpc.getAccount(publicKey(id));
                    console.log(`🔎 Program Check [${name}]:`, info.exists ? "✅ Exists" : "❌ MISSING");
                    if (!info.exists) {
                        console.warn(`WARNING: ${name} (${id}) not found on ${network}. This may cause simulation errors.`);
                    }
                };

                await checkProgram('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', 'Memo Program');
                if (standard === 'core') {
                    await checkProgram(MPL_CORE_ID, 'Metaplex Core');
                    // Core CM ID - usually same as V3 or specific, depending on version. 
                    // For now just logging Core.
                }
            } catch (e) {
                console.error("Debug Check Failed:", e);
            }
            console.log("============================");

            toast.loading(`Deploying ${metadata.name} on Solana ${network}...`, { id: 'sol-deploy' });

            // Create memo instruction for protocol identification
            const memoData = buildProtocolMemo('launchpad:deploy_collection', {
                standard: standard,
            });

            switch (standard) {
                case 'core':
                    result = await createCoreCollection(umi, {
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
                    break;

                case 'token-metadata':
                default:
                    // Clamp seller fee basis points to valid range (0-10000, representing 0-100%)
                    const safeSellerFee = Math.min(Math.max(metadata.sellerFeeBasisPoints, 0), 10000);
                    
                    // Create collection NFT with wallet as update authority
                    result = await createNft(umi, {
                        mint: collectionSigner,
                        name: metadata.name,
                        symbol: metadata.symbol,
                        uri: metadata.uri,
                        sellerFeeBasisPoints: percentAmount(safeSellerFee / 100),
                        isCollection: true,
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
            toast.error(msg, {
                id: 'sol-deploy',
                description: "Check console for detailed program logs."
            });
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

                // Mint limit - clamp to u16 max (65535) as required by Candy Machine guards
                if (phase.maxPerWallet) {
                    const clampedLimit = Math.min(phase.maxPerWallet, 65535);
                    guards.mintLimit = some({ id: 1, limit: clampedLimit });
                }

                return {
                    label: phase.id,
                    guards: guards as DefaultGuardSetArgs,
                };
            });

            let createIx;

            // Log the standard being used
            console.log(`[CM] Initializing Candy Machine with standard: ${standard}`);

            // Clamp itemsAvailable to u32 max (practical limit for Candy Machine)
            // Note: Some serializers use shortU16 internally, so we also warn if > 65535
            const safeItemsAvailable = Math.min(itemsAvailable, 4294967295);
            if (itemsAvailable > 65535) {
                console.warn(`[CM] Large supply (${itemsAvailable}) - some operations may have limits`);
            }

            // Clamp config line lengths to safe u8 values
            const safeNameLength = Math.min(32, 255);
            const safeUriLength = Math.min(200, 255);

            if (standard === 'core') {
                toast.loading(`Initializing Core Candy Machine...`, { id: 'cm-create' });
                // Use Metaplex Core Candy Machine
                createIx = await createCoreCandyMachine(umi, {
                    candyMachine,
                    collection: collectionMint,
                    collectionUpdateAuthority: umi.identity,
                    itemsAvailable: safeItemsAvailable,
                    configLineSettings: some({
                        prefixName: "",
                        nameLength: safeNameLength,
                        prefixUri: "",
                        uriLength: safeUriLength,
                        isSequential: false,
                    }),
                });
            } else {
                toast.loading(`Initializing Legacy Candy Machine...`, { id: 'cm-create' });
                // Clamp seller fee basis points to u16 max (0-10000 is valid range anyway)
                const safeSellerFeeBasisPoints = Math.min(metadata.sellerFeeBasisPoints, 10000);
                
                // Use Legacy Candy Machine V3
                createIx = await create(umi, {
                    candyMachine,
                    collectionMint,
                    collectionUpdateAuthority: umi.identity,
                    tokenStandard: TokenStandard.NonFungible,
                    sellerFeeBasisPoints: percentAmount(safeSellerFeeBasisPoints / 100),
                    itemsAvailable: safeItemsAvailable,
                    creators: metadata.creators.map(c => ({
                        address: publicKey(c.address),
                        verified: c.address === umi.identity.publicKey.toString(),
                        percentageShare: c.share
                    })),
                    configLineSettings: some({
                        prefixName: "",
                        nameLength: safeNameLength,
                        prefixUri: "",
                        uriLength: safeUriLength,
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
            toast.error(msg, {
                id: 'cm-create',
                description: "Check console for detailed program logs."
            });
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
