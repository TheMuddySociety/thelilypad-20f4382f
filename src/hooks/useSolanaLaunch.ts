import { useState, useCallback } from 'react';
import {
    publicKey,
    generateSigner,
    some,
    sol,
    Signer,
    transactionBuilder,
    none,
    dateTime
} from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import {
    createCollectionV1 as createCoreCollection,
    updateV1 as updateCoreAsset,
} from '@metaplex-foundation/mpl-core';
import {
    createCandyMachine as createCoreCandyMachine,
    fetchCandyMachine,
    addConfigLines,
    createCandyGuard as createCoreCandyGuard,
    wrap,
    findCandyGuardPda,
    deleteCandyMachine as deleteCoreCandyMachine,
    deleteCandyGuard as deleteCoreCandyGuard,
    DefaultGuardSetArgs as CoreDefaultGuardSetArgs,
    GuardGroupArgs as CoreGuardGroupArgs,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { setComputeUnitPrice, setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import { SendTransactionError } from '@solana/web3.js';
import { useWallet } from '@/providers/WalletProvider';
import { initializeUmi, SolanaStandard } from '@/config/solana';
import { toast } from 'sonner';
import { buildProtocolMemo, MEMO_PROGRAM_ID } from '@/lib/solanaProtocol';
import { PLATFORM_WALLETS, getLaunchpadFeeSplit } from '@/config/treasury';

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

// Clamp value to prevent serialization overflow
const clampU32 = (value: number): number => Math.min(value, 4294967295);
const clampU16 = (value: number): number => Math.min(value, 65535);

export interface LaunchpadPhase {
    id: string; // group label
    price: number;
    startTime: Date | null;
    endTime: Date | null;
    merkleRoot?: string | null; // for allowlist
    maxPerWallet?: number;

    // Advanced Guards
    payment?: {
        type: 'sol' | 'token';
        amount: number;
        mint?: string; // for SPL tokens
        destination?: string;
    };
    nftGate?: {
        collection: string; // Collection mint address
        burn?: boolean;
    };
    gatekeeper?: {
        network: string; // e.g. Civic
        expireOnUse: boolean;
    };
    addressGate?: string[]; // Allowed wallets (alternative to merkle)
    mintLimit?: {
        id: number;
        limit: number;
    };
}

interface CreateCollectionParams {
    name: string;
    symbol: string;
    imageUri?: string;
    uri?: string;
    royaltyBasisPoints?: number;
    sellerFeeBasisPoints?: number;
    standard?: 'core';
    supplyConfig?: {
        type: string;
        limit?: number;
    };
}

// Store collection signer for Candy Machine creation
let lastCollectionSigner: Signer | null = null;

/**
 * Build guard configuration for a single phase
 */
function buildGuardSetForPhase(
    phase: LaunchpadPhase,
    treasuryWallet: string
): Partial<CoreDefaultGuardSetArgs> {
    const guards: Partial<CoreDefaultGuardSetArgs> = {};

    // 1. Payment Guard (SOL or Token)
    if (phase.payment?.type === 'token' && phase.payment.mint) {
        guards.tokenPayment = some({
            amount: BigInt(phase.payment.amount * 1000000), // Assuming 6 decimals, should be dynamic ideally
            mint: publicKey(phase.payment.mint),
            destinationAta: publicKey(phase.payment.destination || treasuryWallet),
        });
    } else if (phase.price > 0 || (phase.payment?.type === 'sol' && phase.payment.amount > 0)) {
        const amount = phase.payment?.amount || phase.price;
        guards.solPayment = some({
            lamports: sol(amount),
            destination: publicKey(phase.payment?.destination || treasuryWallet),
        });
    }

    // 2. Start/End Date
    if (phase.startTime) {
        guards.startDate = some({ date: dateTime(phase.startTime) });
    }
    if (phase.endTime) {
        guards.endDate = some({ date: dateTime(phase.endTime) });
    }

    // 3. Mint Limit (Per Wallet)
    if (phase.maxPerWallet && phase.maxPerWallet > 0) {
        const limitId = parseInt(phase.id.replace(/\D/g, '') || '1', 10) % 256;
        guards.mintLimit = some({
            id: limitId,
            limit: clampU16(phase.maxPerWallet),
        });
    }

    // 4. Allowlist (Merkle Root)
    if (phase.merkleRoot) {
        const rootHex = phase.merkleRoot.startsWith('0x') ? phase.merkleRoot.slice(2) : phase.merkleRoot;
        const merkleRootBytes = new Uint8Array(rootHex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []);
        if (merkleRootBytes.length === 32) {
            guards.allowList = some({ merkleRoot: merkleRootBytes });
        }
    }

    // 5. NFT Gate (Holders Only)
    if (phase.nftGate) {
        guards.nftGate = some({
            requiredCollection: publicKey(phase.nftGate.collection),
        });
        // Note: Core CM currently supports 'nftGate' for verifying standard Metaplex V1 Collections.
    }

    // 6. Gatekeeper (Bot Protection / Captcha)
    if (phase.gatekeeper) {
        guards.gatekeeper = some({
            gatekeeperNetwork: publicKey(phase.gatekeeper.network),
            expireOnUse: phase.gatekeeper.expireOnUse,
        });
    }

    // 7. Address Gate (Direct List)
    // Note: Core CM addressGate takes a single address. For lists, use Allowlist (Merkle).
    // This is useful for single-wallet phases or testing.
    if (phase.addressGate && phase.addressGate.length === 1) {
        guards.addressGate = some({
            address: publicKey(phase.addressGate[0]),
        });
    }

    return guards;
}

/**
 * Build guard groups from launchpad phases
 */
function buildGuardGroups(
    phases: LaunchpadPhase[],
    treasuryWallet: string
): CoreGuardGroupArgs<CoreDefaultGuardSetArgs>[] {
    return phases.map((phase) => {
        const guards = buildGuardSetForPhase(phase, treasuryWallet);

        return {
            label: phase.id,
            guards: {
                // Set all guards to none by default, then override with phase-specific guards
                botTax: none(),
                solPayment: guards.solPayment || none(),
                tokenPayment: guards.tokenPayment || none(),
                startDate: guards.startDate || none(),
                thirdPartySigner: none(),
                tokenGate: none(),
                gatekeeper: guards.gatekeeper || none(),
                endDate: guards.endDate || none(),
                allowList: guards.allowList || none(),
                mintLimit: guards.mintLimit || none(),
                nftPayment: none(),
                redeemedAmount: none(),
                addressGate: guards.addressGate || none(),
                nftGate: guards.nftGate || none(),
                nftBurn: none(),
                tokenBurn: none(),
                freezeSolPayment: none(),
                freezeTokenPayment: none(),
                programGate: none(),
                allocation: none(),
                token2022Payment: none(),
                solFixedFee: none(),
                nftMintLimit: none(),
                edition: none(),
                assetPayment: none(),
                assetBurn: none(),
                assetMintLimit: none(),
                assetBurnMulti: none(),
                assetPaymentMulti: none(),
                assetGate: none(),
                vanityMint: none(),
            },
        };
    });
}

/**
 * Build default guards (applied when no group is specified)
 */
function buildDefaultGuards(
    defaultPrice: number,
    treasuryWallet: string
): CoreDefaultGuardSetArgs {
    return {
        botTax: some({
            lamports: sol(0.01), // 0.01 SOL bot tax
            lastInstruction: true,
        }),
        solPayment: defaultPrice > 0 ? some({
            lamports: sol(defaultPrice),
            destination: publicKey(treasuryWallet),
        }) : none(),
        tokenPayment: none(),
        startDate: none(),
        thirdPartySigner: none(),
        tokenGate: none(),
        gatekeeper: none(),
        endDate: none(),
        allowList: none(),
        mintLimit: none(),
        nftPayment: none(),
        redeemedAmount: none(),
        addressGate: none(),
        nftGate: none(),
        nftBurn: none(),
        tokenBurn: none(),
        freezeSolPayment: none(),
        freezeTokenPayment: none(),
        programGate: none(),
        allocation: none(),
        token2022Payment: none(),
        solFixedFee: none(),
        nftMintLimit: none(),
        edition: none(),
        assetPayment: none(),
        assetBurn: none(),
        assetMintLimit: none(),
        assetBurnMulti: none(),
        assetPaymentMulti: none(),
        assetGate: none(),
        vanityMint: none(),
    };
}

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

    const uploadFile = useCallback(async (file: File) => {
        const umi = await getUmi();
        const buffer = await file.arrayBuffer();
        const genericFile = {
            buffer: new Uint8Array(buffer),
            fileName: file.name,
            displayName: file.name,
            uniqueName: `${Date.now()}-${file.name}`,
            contentType: file.type,
            extension: file.name.split('.').pop() || '',
            tags: [],
        };
        const [uri] = await umi.uploader.upload([genericFile]);
        return uri;
    }, [getUmi]);

    const uploadFiles = useCallback(async (files: File[]) => {
        const umi = await getUmi();
        const genericFiles = await Promise.all(files.map(async (file) => {
            const buffer = await file.arrayBuffer();
            return {
                buffer: new Uint8Array(buffer),
                fileName: file.name,
                displayName: file.name,
                uniqueName: `${Date.now()}-${file.name}`,
                contentType: file.type,
                extension: file.name.split('.').pop() || '',
                tags: [],
            };
        }));

        // Upload in batches of 10 to avoid payload limits
        const batchSize = 10;
        const uris: string[] = [];

        for (let i = 0; i < genericFiles.length; i += batchSize) {
            const batch = genericFiles.slice(i, i + batchSize);
            const batchUris = await umi.uploader.upload(batch);
            uris.push(...batchUris);
        }

        return uris;
    }, [getUmi]);

    const uploadMetadata = useCallback(async (metadata: any) => {
        const umi = await getUmi();
        const uri = await umi.uploader.uploadJson(metadata);
        return uri;
    }, [getUmi]);

    const uploadJsonMetadataBatch = useCallback(async (metadatas: any[]) => {
        const umi = await getUmi();
        // Convert JSON objects to GenericFiles
        const genericFiles = metadatas.map((metadata, index) => {
            const jsonString = JSON.stringify(metadata);
            return {
                buffer: new Uint8Array(Buffer.from(jsonString)),
                fileName: `${index}.json`,
                displayName: `Metadata ${index}`,
                uniqueName: `${Date.now()}-${index}.json`,
                contentType: 'application/json',
                extension: 'json',
                tags: [],
            };
        });

        // Upload in batches
        const batchSize = 10;
        const uris: string[] = [];

        for (let i = 0; i < genericFiles.length; i += batchSize) {
            const batch = genericFiles.slice(i, i + batchSize);
            const batchUris = await umi.uploader.upload(batch);
            uris.push(...batchUris);
        }

        return uris;
    }, [getUmi]);

    const deploySolanaCollection = useCallback(async (
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

            // Create Collection V1 (Core) with Priority Fees
            // Magic Eden Speed: 50,000 microLamports (high priority)

            // Retry logic for "Blockhash not found"
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    // Ensure fresh blockhash
                    const { blockhash, lastValidBlockHeight } = await umi.rpc.getLatestBlockhash();

                    let builder = createCoreCollection(umi, {
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
                        .add(setComputeUnitPrice(umi, { microLamports: 50_000 }));

                    // Explicitly set blockhash on builder if supported, otherwise sendAndConfirm uses it
                    await builder.sendAndConfirm(umi, {
                        send: { skipPreflight: false },
                        confirm: { commitment: 'confirmed' }
                    });

                    break; // Success
                } catch (innerErr: any) {
                    attempts++;
                    console.warn(`Deployment attempt ${attempts} failed:`, innerErr.message);

                    if (attempts >= maxAttempts) throw innerErr;

                    if (innerErr.message?.includes("Blockhash not found") || innerErr.message?.includes("blockhash")) {
                        console.log("Retrying with fresh blockhash...");
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                    throw innerErr;
                }
            }

            // Wait for confirmation
            toast.loading(`Verifying deployment...`, { id: 'sol-deploy' });
            await waitForConfirmation(umi, new Uint8Array(Buffer.from(collectionSigner.publicKey.toString())));

            toast.success(`Core Collection Deployed!`, { id: 'sol-deploy' });
            return {
                signature: new Uint8Array(0),
                address: collectionSigner.publicKey.toString(),
                collectionAddress: collectionSigner.publicKey.toString(),
                collectionSigner: collectionSigner,
            };
        } catch (err: any) {
            console.error("Core Deployment Error:", err);

            // Verification check for Program ID error
            if (err.message?.includes('Program that does not exist')) {
                console.error("CRITICAL: Metaplex Core Program ID mismatch on this network.");
            }

            if (err instanceof SendTransactionError && err.logs) {
                console.error("--- TRANSACTION LOGS ---");
                console.error(err.logs);
            }

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
        optionalTreasuryWallet?: string
    ): Promise<{ address: string; candyGuardAddress?: string }> => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            const candyMachine = generateSigner(umi);
            const candyGuard = generateSigner(umi);
            const collectionMint = publicKey(collectionAddress);

            // Determine treasury wallet for payment guards
            // Use optionalTreasuryWallet if provided, otherwise fallback to platform defaults
            const treasuryWallet = optionalTreasuryWallet || PLATFORM_WALLETS.treasury;

            // Calculate primary price from phases
            const primaryPhase = phases.find(p => p.price > 0) || phases[0];
            const primaryPrice = primaryPhase?.price || 0;

            toast.loading(`Creating Core Candy Machine...`, { id: 'cm-create' });
            console.log("[CM] Creating Core Candy Machine for:", collectionAddress);
            console.log("[CM] Items available:", itemsAvailable);
            console.log("[CM] Phases:", phases);
            console.log("[CM] Treasury wallet:", treasuryWallet);

            // Retry logic for CM creation
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    await umi.rpc.getLatestBlockhash();

                    // Step 1: Create the Core Candy Machine
                    const cmBuilder = createCoreCandyMachine(umi, {
                        candyMachine,
                        collection: collectionMint,
                        collectionUpdateAuthority: umi.identity,
                        itemsAvailable: BigInt(clampU32(itemsAvailable)),
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

                    // Add Priority Fees: High for massive account creation
                    await (await cmBuilder).add(memoInstruction)
                        .add(setComputeUnitPrice(umi, { microLamports: 100_000 }))
                        .add(setComputeUnitLimit(umi, { units: 800_000 }))
                        .sendAndConfirm(umi, {
                            send: { skipPreflight: true }, // Skip preflight on CM creation to avoid simulation errors on large initializations
                            confirm: { commitment: 'confirmed' }
                        });

                    break; // Success
                } catch (innerErr: any) {
                    attempts++;
                    console.warn(`CM Creation attempt ${attempts} failed:`, innerErr.message);
                    if (attempts >= maxAttempts) throw innerErr;
                    if (innerErr.message?.includes("Blockhash not found") || innerErr.message?.includes("blockhash")) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                    throw innerErr;
                }
            }

            console.log("[CM] Candy Machine created:", candyMachine.publicKey.toString());
            toast.loading(`Candy Machine created! Creating guards...`, { id: 'cm-create' });

            // Step 2: Create Candy Guard with phase-based groups
            console.log("[CM] Building guard configuration...");
            const defaultGuards = buildDefaultGuards(primaryPrice, treasuryWallet);
            const guardGroups = buildGuardGroups(phases, treasuryWallet);
            console.log("[CM] Default guards:", defaultGuards);
            console.log("[CM] Guard groups:", guardGroups.length, "phases");

            // Derive the Candy Guard PDA from the base signer
            // Note: createCoreCandyGuard creates the account at the PDA derived from 'base'
            const candyGuardPda = findCandyGuardPda(umi, { base: candyGuard.publicKey });

            // Create the Candy Guard
            const createGuardBuilder = createCoreCandyGuard(umi, {
                base: candyGuard,
                guards: defaultGuards,
                groups: guardGroups.length > 0 ? guardGroups : undefined,
            });

            await createGuardBuilder
                .add(setComputeUnitPrice(umi, { microLamports: 100_000 })) // Increased from 50k
                .sendAndConfirm(umi, {
                    send: { skipPreflight: true },
                    confirm: { commitment: 'confirmed' }
                });

            // Explicitly wait for the Guard account to be visible/initialized
            console.log("[CM] Waiting for Candy Guard initialization...");
            await waitForConfirmation(umi, new Uint8Array(0), 5); // Just a small delay/check helper if needed, but the loop below is better

            // Verify Guard Account Exists before wrapping
            let guardAccount = await umi.rpc.getAccount(candyGuardPda[0]);
            let retries = 0;
            while (!guardAccount.exists && retries < 5) {
                console.log(`[CM] Guard account not found yet, retrying check... (${retries + 1}/5)`);
                await new Promise(r => setTimeout(r, 1000));
                guardAccount = await umi.rpc.getAccount(candyGuardPda[0]);
                retries++;
            }

            if (!guardAccount.exists) {
                throw new Error("Candy Guard account failed to initialize after transaction success.");
            }

            console.log("[CM] Candy Guard confirmed at:", candyGuardPda[0].toString());
            toast.loading(`Guards created! Wrapping Candy Machine...`, { id: 'cm-create' });

            // Step 3: Wrap the Candy Machine with the Candy Guard
            // Fix for AccountNotInitialized: Ensure we are passing the initialized PDA correctly
            const wrapBuilder = wrap(umi, {
                candyGuard: candyGuardPda[0], // Pass the PublicKey directly
                candyMachine: candyMachine.publicKey,
                candyMachineAuthority: umi.identity,
            });

            await wrapBuilder
                .add(setComputeUnitPrice(umi, { microLamports: 50_000 }))
                .sendAndConfirm(umi);

            console.log("[CM] Candy Machine wrapped with Guard successfully!");

            // Log fee distribution info
            const feeSplit = getLaunchpadFeeSplit(primaryPrice);
            console.log("[CM] Fee distribution for price", primaryPrice, "SOL:");
            console.log("  - Creator:", feeSplit.creatorAmount, "SOL");
            console.log("  - Treasury:", feeSplit.treasuryAmount, "SOL");
            console.log("  - Team:", feeSplit.teamAmount, "SOL");
            console.log("  - Buyback:", feeSplit.buybackAmount, "SOL");

            toast.success(`Candy Machine Ready with Guards!`, { id: 'cm-create' });

            return {
                address: candyMachine.publicKey.toString(),
                candyGuardAddress: candyGuardPda[0].toString(),
            };

        } catch (err: any) {
            console.error("Candy Machine creation error:", err);

            if (err instanceof SendTransactionError && err.logs) {
                console.error("--- TRANSACTION LOGS ---");
                console.error(err.logs);
            }

            const msg = err.message || "Failed to create Candy Machine";
            setError(msg);
            toast.error(msg, { id: 'cm-create', description: "Check logs for details." });
            throw err;
        } finally {
            setIsLoading(false);
        }

    }, [getUmi]);

    const insertItemsToCandyMachine = useCallback(async (
        candyMachineAddress: string,
        items: { name: string; uri: string }[],
        batchSize = 10
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            const cmPublicKey = publicKey(candyMachineAddress);

            toast.loading(`Fetching Candy Machine state...`, { id: 'cm-insert' });
            // Fetch to get current index
            const candyMachine = await fetchCandyMachine(umi, cmPublicKey);

            // Get currently loaded items to determine start index
            // Use 'as any' safe access as strict types might vary by version
            const itemsLoaded = Number((candyMachine as any).itemsLoaded ?? 0);
            const itemsAvailable = Number((candyMachine as any).data?.itemsAvailable ?? (candyMachine as any).itemsAvailable ?? 0);

            console.log(`[CM Insert] Found ${itemsLoaded} items loaded out of ${itemsAvailable}`);

            if (itemsLoaded + items.length > itemsAvailable) {
                throw new Error(`Cannot insert ${items.length} items. Only ${itemsAvailable - itemsLoaded} slots remaining.`);
            }

            console.log(`[CM Insert] Inserting ${items.length} items to ${candyMachineAddress} starting at index ${itemsLoaded}`);

            // Chunk items
            const chunks = [];
            for (let i = 0; i < items.length; i += batchSize) {
                chunks.push(items.slice(i, i + batchSize));
            }

            let successfulChunks = 0;
            let currentIndex = itemsLoaded; // Start from where we left off

            for (const [chunkIndex, chunk] of chunks.entries()) {
                toast.loading(`Inserting batch ${chunkIndex + 1}/${chunks.length}...`, { id: 'cm-insert' });

                // Add config lines
                await addConfigLines(umi, {
                    candyMachine: cmPublicKey,
                    index: currentIndex,
                    configLines: chunk.map((item) => ({
                        name: item.name,
                        uri: item.uri,
                    })),
                })
                    .add(setComputeUnitPrice(umi, { microLamports: 10_000 }))
                    .sendAndConfirm(umi);

                currentIndex += chunk.length;
                successfulChunks++;
            }

            toast.success(`Successfully inserted ${items.length} items!`, { id: 'cm-insert' });
            return true;
        } catch (err: any) {
            console.error("Insert items error:", err);
            const msg = err.message || "Failed to insert items";
            setError(msg);
            toast.error(msg, { id: 'cm-insert' });
            // Don't throw, just return false so UI can handle partial success if needed
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [getUmi]);

    const deleteCandyMachine = useCallback(async (
        candyMachineAddress: string,
        candyGuardAddress?: string
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            const cmPublicKey = publicKey(candyMachineAddress);

            toast.loading(`Deleting Candy Machine...`, { id: 'cm-delete' });

            // 1. Delete Candy Guard if exists
            if (candyGuardAddress) {
                console.log("Deleting Candy Guard:", candyGuardAddress);
                await deleteCoreCandyGuard(umi, {
                    candyGuard: publicKey(candyGuardAddress),
                })
                    .add(setComputeUnitPrice(umi, { microLamports: 20_000 }))
                    .sendAndConfirm(umi);
            } else {
                // Try to find it if not provided?
                try {
                    const guardPda = findCandyGuardPda(umi, { base: cmPublicKey }); // This might be wrong base
                    // Actually guards are usually derived or separate. Pass reference if possible.
                } catch (e) { /* ignore */ }
            }

            // 2. Delete Candy Machine
            console.log("Deleting Candy Machine:", candyMachineAddress);
            await deleteCoreCandyMachine(umi, {
                candyMachine: cmPublicKey,
            })
                .add(setComputeUnitPrice(umi, { microLamports: 20_000 }))
                .sendAndConfirm(umi);

            toast.success(`Candy Machine deleted and rent reclaimed!`, { id: 'cm-delete' });
            return true;
        } catch (err: any) {
            console.error("Delete CM error:", err);
            const msg = err.message || "Failed to delete Candy Machine";
            setError(msg);
            toast.error(msg, { id: 'cm-delete' });
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [getUmi]);

    const createCollection = useCallback(async (params: CreateCollectionParams) => {
        const umi = await getUmi();
        const currentUser = umi.identity.publicKey.toString();

        return deploySolanaCollection({
            name: params.name,
            symbol: params.symbol,
            uri: params.uri || params.imageUri || '',
            sellerFeeBasisPoints: params.sellerFeeBasisPoints || 0,
            creators: [{ address: currentUser, share: 100 }]
        });
    }, [deploySolanaCollection, getUmi]);

    const batchRevealAssets = useCallback(async (
        assets: { address: string; uri: string; name?: string }[],
        batchSize = 5
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const umi = await getUmi();
            const chunks = [];
            for (let i = 0; i < assets.length; i += batchSize) {
                chunks.push(assets.slice(i, i + batchSize));
            }

            let successfulCount = 0;

            for (const [index, chunk] of chunks.entries()) {
                toast.loading(`Revealing batch ${index + 1}/${chunks.length}...`, { id: 'cm-reveal' });

                let builder = transactionBuilder();

                for (const asset of chunk) {
                    builder = builder.add(updateCoreAsset(umi, {
                        asset: publicKey(asset.address),
                        newUri: some(asset.uri),
                        newName: asset.name ? some(asset.name) : none(),
                    }));
                }

                // Priority Fee for reveals
                builder = builder.add(setComputeUnitPrice(umi, { microLamports: 10_000 }));

                await builder.sendAndConfirm(umi);
                successfulCount += chunk.length;
            }

            toast.success(`Successfully revealed ${successfulCount} assets!`, { id: 'cm-reveal' });
            return true;
        } catch (err: any) {
            console.error("Reveal error:", err);
            const msg = err.message || "Failed to reveal assets";
            setError(msg);
            toast.error(msg, { id: 'cm-reveal' });
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [getUmi]);

    return {
        isLoading,
        error,
        deploySolanaCollection,
        createLaunchpadCandyMachine,
        createCollection,
        insertItemsToCandyMachine,
        deleteCandyMachine,
        batchRevealAssets,
        uploadFile,
        uploadFiles,
        uploadMetadata,
        uploadJsonMetadataBatch,
        getLastCollectionSigner: () => lastCollectionSigner,
    };
};
