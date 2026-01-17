import { useState, useCallback } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@/providers/WalletProvider';
import { getSolanaRpcUrl } from '@/config/solana';
import { TREASURY_CONFIG, validateMinimumAmount } from '@/config/treasury';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentResult {
  success: boolean;
  signature?: string;
  error?: string;
  verified?: boolean;
}

export interface PaymentParams {
  amount: number; // in SOL
  recipient?: string; // defaults to treasury
  memo?: string;
  transactionType: 'listing' | 'offer' | 'shopPurchase' | 'raffleEntry' | 'blindBox' | 'tip';
}

export interface VerificationResult {
  verified: boolean;
  error?: string;
  transaction?: {
    signature: string;
    amount: number;
    sender: string;
    recipient: string;
    confirmedAt: string;
  };
}

export function useSolanaPayment() {
  const { getSolanaProvider, network, address } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);

  // Get Solana connection
  const getConnection = useCallback(() => {
    const rpcUrl = getSolanaRpcUrl(network as 'mainnet' | 'devnet' | 'testnet');
    return new Connection(rpcUrl, 'confirmed');
  }, [network]);

  // Send SOL payment
  const sendPayment = useCallback(async ({
    amount,
    recipient = TREASURY_CONFIG.treasuryWallet,
    memo,
    transactionType,
  }: PaymentParams): Promise<PaymentResult> => {
    setIsProcessing(true);
    
    try {
      // Validate minimum amount
      const validation = validateMinimumAmount(amount, transactionType);
      if (!validation.valid) {
        return { success: false, error: validation.message };
      }

      const provider = getSolanaProvider();
      if (!provider || !provider.publicKey) {
        return { success: false, error: 'Wallet not connected' };
      }

      const connection = getConnection();
      const senderPubkey = provider.publicKey;
      const recipientPubkey = new PublicKey(recipient);
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      // Check sender balance
      const balance = await connection.getBalance(senderPubkey);
      if (balance < lamports + 5000) { // Include fee buffer
        return { 
          success: false, 
          error: `Insufficient balance. You have ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL` 
        };
      }

      // Create transaction
      const transaction = new Transaction();
      
      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;

      // Sign and send transaction
      const signedTx = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      console.log('Transaction sent:', signature);

      // Wait for confirmation with timeout
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        console.error('Transaction failed:', confirmation.value.err);
        return { 
          success: false, 
          signature,
          error: 'Transaction failed on-chain' 
        };
      }

      setLastSignature(signature);
      console.log('Transaction confirmed:', signature);

      return { 
        success: true, 
        signature,
        verified: false, // Will be verified by backend
      };

    } catch (error: any) {
      console.error('Payment error:', error);
      
      // Handle user rejection
      if (error.message?.includes('User rejected')) {
        return { success: false, error: 'Transaction cancelled by user' };
      }
      
      return { 
        success: false, 
        error: error.message || 'Payment failed' 
      };
    } finally {
      setIsProcessing(false);
    }
  }, [getSolanaProvider, getConnection]);

  // Verify transaction on backend
  const verifyTransaction = useCallback(async (
    signature: string,
    expectedAmount: number,
    expectedRecipient: string = TREASURY_CONFIG.treasuryWallet
  ): Promise<VerificationResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-solana-tx', {
        body: {
          signature,
          expectedAmount,
          expectedRecipient,
          network,
        },
      });

      if (error) {
        console.error('Verification error:', error);
        return { verified: false, error: error.message };
      }

      return data as VerificationResult;
    } catch (error: any) {
      console.error('Verification request failed:', error);
      return { verified: false, error: error.message || 'Verification failed' };
    }
  }, [network]);

  // Combined send and verify
  const sendAndVerifyPayment = useCallback(async (
    params: PaymentParams
  ): Promise<PaymentResult & { verification?: VerificationResult }> => {
    const paymentResult = await sendPayment(params);
    
    if (!paymentResult.success || !paymentResult.signature) {
      return paymentResult;
    }

    // Verify on backend
    const verification = await verifyTransaction(
      paymentResult.signature,
      params.amount,
      params.recipient
    );

    if (!verification.verified) {
      toast.error('Transaction verification failed. Please contact support.');
      return {
        ...paymentResult,
        verified: false,
        verification,
      };
    }

    return {
      ...paymentResult,
      verified: true,
      verification,
    };
  }, [sendPayment, verifyTransaction]);

  // Check if a transaction signature already exists (prevent double-spend)
  const checkDuplicateTransaction = useCallback(async (
    signature: string,
    tableName: string
  ): Promise<boolean> => {
    try {
      // This is a generic check - specific tables will need their own queries
      const { data, error } = await supabase
        .from(tableName as any)
        .select('id')
        .eq('tx_hash', signature)
        .maybeSingle();

      if (error) {
        console.error('Duplicate check error:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Duplicate check failed:', error);
      return false;
    }
  }, []);

  return {
    sendPayment,
    verifyTransaction,
    sendAndVerifyPayment,
    checkDuplicateTransaction,
    isProcessing,
    lastSignature,
  };
}
