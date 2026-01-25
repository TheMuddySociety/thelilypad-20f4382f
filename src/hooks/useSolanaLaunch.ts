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
} from '@metaplex-foundation/mpl-core';
import {
    createCandyMachine as createCoreCandyMachine,
    fetchCandyMachine,
    addConfigLines,
    createCandyGuard as createCoreCandyGuard,
    wrap,
    findCandyGuardPda,
    DefaultGuardSetArgs as CoreDefaultGuardSetArgs,
    GuardGroupArgs as CoreGuardGroupArgs,
} from '@metaplex-foundation/mpl-core-candy-machine';
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

    // SOL Payment guard - pricing
    if (phase.price > 0) {
        guards.solPayment = some({
            lamports: sol(phase.price),
            destination: publicKey(treasuryWallet),
        });
    }

    // Start Date guard
    if (phase.startTime) {
        guards.startDate = some({
            date: dateTime(phase.startTime),
        });
    }

    // End Date guard
    if (phase.endTime) {
        guards.endDate = some({
            date: dateTime(phase.endTime),
        });
    }

    // Mint Limit guard - per wallet limit
    if (phase.maxPerWallet && phase.maxPerWallet > 0) {
        // Each phase needs a unique ID for mint limit tracking
        const limitId = parseInt(phase.id.replace(/\D/g, '') || '1', 10) % 256;
        guards.mintLimit = some({
            id: limitId,
            limit: clampU16(phase.maxPerWallet),
        });
    }

    // Allowlist guard - merkle root for whitelist
    if (phase.merkleRoot) {
        // Convert hex string to Uint8Array (32 bytes)
        const rootHex = phase.merkleRoot.startsWith('0x')
            ? phase.merkleRoot.slice(2)
            : phase.merkleRoot;
        const merkleRootBytes = new Uint8Array(
            rootHex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []
        );

        if (merkleRootBytes.length === 32) {
            guards.allowList = some({
                merkleRoot: merkleRootBytes,
            });
        }
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
                tokenPayment: none(),
                startDate: guards.startDate || none(),
                thirdPartySigner: none(),
                tokenGate: none(),
                gatekeeper: none(),
                endDate: guards.endDate || none(),
                allowList: guards.allowList || none(),
                mintLimit: guards.mintLimit || none(),
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

            // Create Collection V1 (Core)
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
                signature: new Uint8Array(0),
                address: collectionSigner.publicKey.toString(),
                collectionAddress: collectionSigner.publicKey.toString(),
                collectionSigner: collectionSigner,
            };
        } catch (err: any) {
            console.error("Core Deployment Error:", err);

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

            await (await cmBuilder).add(memoInstruction).sendAndConfirm(umi);

            console.log("[CM] Candy Machine created:", candyMachine.publicKey.toString());
            toast.loading(`Candy Machine created! Creating guards...`, { id: 'cm-create' });

            // Step 2: Create Candy Guard with phase-based groups
            console.log("[CM] Building guard configuration...");

            // Build default guards (fallback when no group specified)
            const defaultGuards = buildDefaultGuards(primaryPrice, treasuryWallet);

            // Build guard groups from phases
            const guardGroups = buildGuardGroups(phases, treasuryWallet);

            console.log("[CM] Default guards:", defaultGuards);
            console.log("[CM] Guard groups:", guardGroups.length, "phases");

            // Create the Candy Guard
            // The base signer is used to derive the candyGuard PDA
            const createGuardBuilder = createCoreCandyGuard(umi, {
                base: candyGuard,
                guards: defaultGuards,
                groups: guardGroups.length > 0 ? guardGroups : undefined,
            });

            await createGuardBuilder.sendAndConfirm(umi);

            // Derive the Candy Guard PDA from the base signer
            const candyGuardPda = findCandyGuardPda(umi, { base: candyGuard.publicKey });
            console.log("[CM] Candy Guard created at PDA:", candyGuardPda[0].toString());

            toast.loading(`Guards created! Wrapping Candy Machine...`, { id: 'cm-create' });

            // Step 3: Wrap the Candy Machine with the Candy Guard
            // This links them together so guards are enforced during minting
            const wrapBuilder = wrap(umi, {
                candyGuard: candyGuardPda,
                candyMachine: candyMachine.publicKey,
                candyMachineAuthority: umi.identity,
            });

            await wrapBuilder.sendAndConfirm(umi);
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

    // Simplified wrapper
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

    return {
        isLoading,
        error,
        deploySolanaCollection,
        createLaunchpadCandyMachine,
        createCollection,
        getLastCollectionSigner: () => lastCollectionSigner,
    };
};
