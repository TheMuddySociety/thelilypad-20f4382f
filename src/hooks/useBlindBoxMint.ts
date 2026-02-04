import { useState, useCallback } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { publicKey, generateSigner } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mintV1, fetchCandyMachine, findCandyGuardPda } from '@metaplex-foundation/mpl-core-candy-machine';
import { setComputeUnitPrice, setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import { useWallet } from '@/providers/WalletProvider';
import { initializeUmi, getSolanaRpcUrl } from '@/config/solana';
import { TREASURY_CONFIG } from '@/config/treasury';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createProtocolMemoInstruction } from '@/lib/solanaProtocol';

interface BlindBoxReward {
    type: 'nft' | 'token' | 'shop_item';
    name: string;
    value: string;
    rarity: string;
    weight: number;
}

interface BlindBox {
    id: string;
    name: string;
    price: number;
    rewards: BlindBoxReward[];
    remaining_supply: number;
    nft_pool_address?: string; // Candy Machine address for NFT rewards
    token_mint?: string;       // SPL token mint for token rewards
    escrow_wallet?: string;    // Wallet holding reward funds
}

interface MintResult {
    success: boolean;
    signature?: string;
    reward?: BlindBoxReward;
    nftAddress?: string;
    error?: string;
}

/**
 * Hook for handling Blind Box purchases and on-chain reward distribution.
 * 
 * Flow:
 * 1. User pays SOL to treasury
 * 2. Backend verifies payment
 * 3. Reward is randomly selected (weighted by rarity)
 * 4. If NFT reward: mint from Candy Machine pool
 * 5. If token reward: transfer from escrow
 * 6. Record transaction in database
 */
export function useBlindBoxMint() {
    const { getSolanaProvider, network, address, setTransactionPending } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSignature, setLastSignature] = useState<string | null>(null);

    // Get Solana connection
    const getConnection = useCallback(() => {
        const rpcUrl = getSolanaRpcUrl(network as 'mainnet' | 'devnet' | 'testnet');
        return new Connection(rpcUrl, 'confirmed');
    }, [network]);

    // Get UMI instance for Metaplex operations
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

    /**
     * Select a random reward based on weighted probabilities
     */
    const selectRandomReward = useCallback((rewards: BlindBoxReward[]): BlindBoxReward => {
        if (!rewards || rewards.length === 0) {
            return { type: 'token', name: 'Default', value: '0.01', rarity: 'common', weight: 100 };
        }

        const totalWeight = rewards.reduce((sum, r) => sum + (r.weight || 1), 0);
        let random = Math.random() * totalWeight;

        for (const reward of rewards) {
            random -= reward.weight || 1;
            if (random <= 0) {
                return reward;
            }
        }

        return rewards[rewards.length - 1];
    }, []);

    /**
     * Pay for blind box purchase
     */
    const payForBlindBox = useCallback(async (
        box: BlindBox,
        quantity: number = 1
    ): Promise<{ success: boolean; signature?: string; error?: string }> => {
        setTransactionPending(true);

        try {
            const provider = getSolanaProvider();
            if (!provider || !provider.publicKey) {
                return { success: false, error: 'Wallet not connected' };
            }

            const connection = getConnection();
            const senderPubkey = provider.publicKey;
            const treasuryPubkey = new PublicKey(TREASURY_CONFIG.treasuryWallet);
            const totalCost = box.price * quantity;
            const lamports = Math.floor(totalCost * LAMPORTS_PER_SOL);

            // Check balance
            const balance = await connection.getBalance(senderPubkey);
            if (balance < lamports + 10000) {
                return {
                    success: false,
                    error: `Insufficient balance. Need ${totalCost} SOL, have ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`
                };
            }

            // Create transaction
            const transaction = new Transaction();

            // Transfer to treasury
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: senderPubkey,
                    toPubkey: treasuryPubkey,
                    lamports,
                })
            );

            // Add protocol memo
            transaction.add(
                createProtocolMemoInstruction('blindbox:purchase', {
                    box: box.id.slice(0, 8),
                    qty: quantity.toString(),
                })
            );

            // Get blockhash and send
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = senderPubkey;

            const signedTx = await provider.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            // Wait for confirmation
            await connection.confirmTransaction(
                { signature, blockhash, lastValidBlockHeight },
                'confirmed'
            );

            setLastSignature(signature);
            return { success: true, signature };

        } catch (error: any) {
            console.error('Blind box payment error:', error);
            if (error.message?.includes('User rejected')) {
                return { success: false, error: 'Transaction cancelled' };
            }
            return { success: false, error: error.message || 'Payment failed' };
        } finally {
            setTransactionPending(false);
        }
    }, [getSolanaProvider, getConnection, setTransactionPending]);

    /**
     * Mint NFT reward from Candy Machine pool
     */
    const mintNftReward = useCallback(async (
        candyMachineAddress: string
    ): Promise<{ success: boolean; nftAddress?: string; signature?: string; error?: string }> => {
        try {
            const umi = await getUmi();
            const nftMint = generateSigner(umi);
            const cmPublicKey = publicKey(candyMachineAddress);

            toast.loading('Minting your NFT reward...', { id: 'nft-mint' });

            // Fetch Candy Machine
            const candyMachine = await fetchCandyMachine(umi, cmPublicKey);

            // Check availability
            if (candyMachine.itemsRedeemed >= candyMachine.data.itemsAvailable) {
                throw new Error('NFT pool is empty!');
            }

            // Mint NFT
            const tx = mintV1(umi, {
                candyMachine: candyMachine.publicKey,
                asset: nftMint,
                collection: candyMachine.collectionMint,
            })
                .add(setComputeUnitPrice(umi, { microLamports: 50_000 }))
                .add(setComputeUnitLimit(umi, { units: 600_000 }));

            const result = await tx.sendAndConfirm(umi);
            const signatureStr = Buffer.from(result.signature).toString('base64');

            toast.success('NFT Reward Minted!', { id: 'nft-mint' });

            return {
                success: true,
                nftAddress: nftMint.publicKey.toString(),
                signature: signatureStr,
            };

        } catch (error: any) {
            console.error('NFT mint error:', error);
            toast.error('Failed to mint NFT reward', { id: 'nft-mint' });
            return { success: false, error: error.message };
        }
    }, [getUmi]);

    /**
     * Complete blind box purchase flow
     */
    const purchaseBlindBox = useCallback(async (
        box: BlindBox,
        quantity: number = 1,
        userId: string
    ): Promise<MintResult[]> => {
        setIsProcessing(true);
        const results: MintResult[] = [];

        try {
            // Step 1: Pay for boxes
            toast.loading(`Processing payment for ${quantity} box(es)...`, { id: 'blindbox-payment' });
            const paymentResult = await payForBlindBox(box, quantity);

            if (!paymentResult.success) {
                toast.error(paymentResult.error || 'Payment failed', { id: 'blindbox-payment' });
                return [{ success: false, error: paymentResult.error }];
            }

            toast.success('Payment confirmed!', { id: 'blindbox-payment' });

            // Step 2: Open each box
            for (let i = 0; i < quantity; i++) {
                const reward = selectRandomReward(box.rewards);
                let result: MintResult = { success: true, reward };

                // Step 3: Distribute reward based on type
                if (reward.type === 'nft' && box.nft_pool_address) {
                    // Mint NFT from pool
                    const nftResult = await mintNftReward(box.nft_pool_address);
                    result = {
                        ...result,
                        ...nftResult,
                    };
                } else if (reward.type === 'token') {
                    // Token rewards are recorded in database
                    // Actual transfer would be done via backend escrow
                    result.signature = paymentResult.signature;
                }

                results.push(result);

                // Record in database
                await supabase
                    .from('lily_blind_box_purchases')
                    .insert({
                        blind_box_id: box.id,
                        user_id: userId,
                        quantity: 1,
                        total_paid: box.price,
                        rewards_received: [reward],
                        tx_hash: result.signature || paymentResult.signature,
                        nft_address: result.nftAddress,
                    } as any);
            }

            // Update remaining supply (decrement by quantity)
            await supabase
                .from('lily_blind_boxes')
                .update({ remaining_supply: box.remaining_supply - quantity })
                .eq('id', box.id);

            return results;

        } catch (error: any) {
            console.error('Blind box purchase error:', error);
            toast.error(error.message || 'Purchase failed');
            return [{ success: false, error: error.message }];
        } finally {
            setIsProcessing(false);
        }
    }, [payForBlindBox, selectRandomReward, mintNftReward]);

    /**
     * Check if user can purchase more boxes
     */
    const checkPurchaseLimit = useCallback(async (
        boxId: string,
        userId: string,
        maxPerUser: number | null
    ): Promise<{ canPurchase: boolean; remaining: number }> => {
        if (!maxPerUser) return { canPurchase: true, remaining: Infinity };

        const { data } = await supabase
            .from('lily_blind_box_purchases')
            .select('quantity')
            .eq('blind_box_id', boxId)
            .eq('user_id', userId);

        const totalPurchased = (data || []).reduce((sum, p) => sum + ((p as any).quantity || 0), 0);
        const remaining = maxPerUser - totalPurchased;

        return {
            canPurchase: remaining > 0,
            remaining: Math.max(0, remaining),
        };
    }, []);

    return {
        purchaseBlindBox,
        payForBlindBox,
        mintNftReward,
        selectRandomReward,
        checkPurchaseLimit,
        isProcessing,
        lastSignature,
    };
}
