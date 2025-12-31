import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { useMessageSigning } from "@/hooks/useMessageSigning";
import { supabase } from "@/integrations/supabase/client";
import { parseEther } from "viem";
import { toast } from "sonner";
import {
  getEIP712Domain,
  MINT_REQUEST_TYPES,
  MONAD_MAINNET_CHAIN_ID,
  MONAD_TESTNET_CHAIN_ID,
} from "@/types/eip712";

interface GaslessMintState {
  isSubmitting: boolean;
  isSigning: boolean;
  isConfirming: boolean;
  txHash: string | null;
  error: string | null;
  status: 'idle' | 'signing' | 'submitting' | 'confirming' | 'confirmed' | 'failed';
}

interface UseGaslessMintReturn extends GaslessMintState {
  gaslessMint: (
    quantity: number,
    pricePerNft: string,
    collectionId: string,
    collectionName: string
  ) => Promise<string | null>;
  resetState: () => void;
}

export function useGaslessMint(contractAddress: string | null): UseGaslessMintReturn {
  const { address, network, chainId } = useWallet();
  const { signMintRequest, isSigning: isSigningMessage } = useMessageSigning();
  
  const [state, setState] = useState<GaslessMintState>({
    isSubmitting: false,
    isSigning: false,
    isConfirming: false,
    txHash: null,
    error: null,
    status: 'idle',
  });

  const resetState = useCallback(() => {
    setState({
      isSubmitting: false,
      isSigning: false,
      isConfirming: false,
      txHash: null,
      error: null,
      status: 'idle',
    });
  }, []);

  // Poll for transaction status
  const pollForConfirmation = useCallback(async (metaTxId: string): Promise<string | null> => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      const { data, error } = await supabase
        .from("meta_transactions")
        .select("status, tx_hash, error_message")
        .eq("id", metaTxId)
        .single();

      if (error) {
        console.error("Error polling meta transaction:", error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      if (data.status === "confirmed" && data.tx_hash) {
        return data.tx_hash;
      }

      if (data.status === "failed") {
        throw new Error(data.error_message || "Transaction failed");
      }

      if (data.status === "expired") {
        throw new Error("Signature expired before transaction could be processed");
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error("Transaction confirmation timed out");
  }, []);

  const gaslessMint = useCallback(
    async (
      quantity: number,
      pricePerNft: string,
      collectionId: string,
      collectionName: string
    ): Promise<string | null> => {
      if (!address) {
        toast.error("Wallet not connected");
        return null;
      }

      if (!contractAddress) {
        toast.error("Contract not deployed");
        return null;
      }

      resetState();

      try {
        // Step 1: Sign the request
        setState(prev => ({ ...prev, isSigning: true, status: 'signing' }));
        
        const totalPriceWei = parseEther(pricePerNft) * BigInt(quantity);
        
        toast.info("Please sign the transaction in your wallet", {
          description: `Signing request to mint ${quantity} NFT${quantity > 1 ? 's' : ''} from ${collectionName}`,
        });

        const signResult = await signMintRequest(
          contractAddress,
          quantity,
          totalPriceWei.toString()
        );

        setState(prev => ({ ...prev, isSigning: false, isSubmitting: true, status: 'submitting' }));

        // Step 2: Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error("Not authenticated");
        }

        // Step 3: Create meta transaction record
        const currentChainId = chainId || (network === "testnet" ? MONAD_TESTNET_CHAIN_ID : MONAD_MAINNET_CHAIN_ID);
        
        const typedData = {
          domain: getEIP712Domain(currentChainId),
          types: MINT_REQUEST_TYPES,
          primaryType: "MintRequest",
          message: signResult.request,
        };

        // Insert meta transaction - use type assertion for new table
        const { data: metaTx, error: insertError } = await supabase
          .from("meta_transactions" as "collections")
          .insert({
            user_id: session.user.id,
            user_address: address.toLowerCase(),
            action_type: "mint",
            collection_id: collectionId,
            nonce: signResult.nonce,
            typed_data: typedData,
            signature: signResult.signature,
            deadline: new Date(signResult.deadline * 1000).toISOString(),
            status: "pending",
          } as unknown as Record<string, unknown>)
          .select("id")
          .single();

        if (insertError) {
          throw new Error(`Failed to create meta transaction: ${insertError.message}`);
        }

        // Step 4: Submit to relayer
        toast.info("Submitting to gasless relayer...", {
          description: "The platform will pay the gas fees for you",
        });

        const { data: relayerResult, error: relayerError } = await supabase.functions.invoke(
          "gasless-relayer",
          {
            body: {
              metaTransactionId: metaTx.id,
            },
          }
        );

        if (relayerError) {
          throw new Error(`Relayer error: ${relayerError.message}`);
        }

        if (relayerResult?.error) {
          throw new Error(relayerResult.error);
        }

        // Step 5: Wait for confirmation
        setState(prev => ({ ...prev, isSubmitting: false, isConfirming: true, status: 'confirming' }));

        if (relayerResult?.txHash) {
          // Transaction was submitted immediately
          setState(prev => ({ ...prev, txHash: relayerResult.txHash }));
          
          toast.success("Transaction submitted!", {
            description: "Waiting for confirmation...",
          });

          // Poll for confirmation
          const confirmedTxHash = await pollForConfirmation(metaTx.id);
          
          setState(prev => ({
            ...prev,
            isConfirming: false,
            txHash: confirmedTxHash,
            status: 'confirmed',
          }));

          toast.success("NFT minted successfully!", {
            description: `Gasless mint completed`,
            action: {
              label: "View TX",
              onClick: () => {
                const explorerUrl = network === "testnet"
                  ? `https://testnet.monadexplorer.com/tx/${confirmedTxHash}`
                  : `https://monadexplorer.com/tx/${confirmedTxHash}`;
                window.open(explorerUrl, "_blank");
              },
            },
          });

          return confirmedTxHash;
        } else {
          // Relayer will process async, poll for status
          const confirmedTxHash = await pollForConfirmation(metaTx.id);
          
          setState(prev => ({
            ...prev,
            isConfirming: false,
            txHash: confirmedTxHash,
            status: 'confirmed',
          }));

          toast.success("NFT minted successfully!", {
            description: `Gasless mint completed`,
          });

          return confirmedTxHash;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to mint";
        
        setState(prev => ({
          ...prev,
          isSigning: false,
          isSubmitting: false,
          isConfirming: false,
          error: errorMessage,
          status: 'failed',
        }));

        // User rejected signing
        if (errorMessage.includes("rejected") || errorMessage.includes("denied") || errorMessage.includes("cancelled")) {
          toast.error("Transaction cancelled", {
            description: "You cancelled the signature request",
          });
        } else {
          toast.error("Gasless mint failed", {
            description: errorMessage,
          });
        }

        return null;
      }
    },
    [address, contractAddress, network, chainId, signMintRequest, pollForConfirmation, resetState]
  );

  return {
    ...state,
    isSigning: state.isSigning || isSigningMessage,
    gaslessMint,
    resetState,
  };
}
