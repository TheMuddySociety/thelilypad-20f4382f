import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { NFT_CONTRACT_ABI } from "@/config/nftContract";
import { encodeFunctionData } from "viem";
import { supabase } from "@/integrations/supabase/client";

interface TransferState {
  isTransferring: boolean;
  txHash: string | null;
  error: string | null;
}

export function useNFTTransfer() {
  const { address, isConnected } = useWallet();
  const [state, setState] = useState<TransferState>({
    isTransferring: false,
    txHash: null,
    error: null,
  });

  const resetState = useCallback(() => {
    setState({
      isTransferring: false,
      txHash: null,
      error: null,
    });
  }, []);

  const validateAddress = useCallback((toAddress: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(toAddress);
  }, []);

  const transferNFT = useCallback(async (
    contractAddress: string,
    tokenId: number,
    toAddress: string,
    nftId: string
  ): Promise<string | null> => {
    if (!isConnected || !address || typeof window.ethereum === "undefined") {
      setState(prev => ({ ...prev, error: "Wallet not connected" }));
      return null;
    }

    if (!validateAddress(toAddress)) {
      setState(prev => ({ ...prev, error: "Invalid recipient address" }));
      return null;
    }

    if (toAddress.toLowerCase() === address.toLowerCase()) {
      setState(prev => ({ ...prev, error: "Cannot transfer to yourself" }));
      return null;
    }

    setState({
      isTransferring: true,
      txHash: null,
      error: null,
    });

    try {
      // Encode the transferFrom function call (standard ERC721)
      const data = encodeFunctionData({
        abi: NFT_CONTRACT_ABI,
        functionName: "transferFrom",
        args: [address as `0x${string}`, toAddress as `0x${string}`, BigInt(tokenId)],
      });

      // Send transaction
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
        }],
      });

      // Wait for receipt
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 60;

      while (!receipt && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          receipt = await window.ethereum.request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
          });
        } catch (e) {
          // Continue waiting
        }
        attempts++;
      }

      if (receipt && receipt.status === "0x0") {
        throw new Error("Transfer transaction failed");
      }

      // Update the NFT ownership in database
      const { data: { user } } = await supabase.auth.getUser();
      
      // Record the transfer transaction
      if (user) {
        const { data: nftData } = await supabase
          .from("minted_nfts")
          .select("collection_id")
          .eq("id", nftId)
          .maybeSingle();

        if (nftData) {
          await supabase.from("nft_transactions").insert({
            user_id: user.id,
            collection_id: nftData.collection_id,
            tx_hash: txHash,
            tx_type: "transfer",
            quantity: 1,
            price_paid: 0,
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
          });
        }
      }

      // Update the NFT owner in database
      await supabase
        .from("minted_nfts")
        .update({ 
          owner_address: toAddress.toLowerCase(),
          owner_id: null // Will be null since new owner may not be in our system
        })
        .eq("id", nftId);

      setState({
        isTransferring: false,
        txHash,
        error: null,
      });

      return txHash;

    } catch (error: any) {
      console.error("Transfer error:", error);
      
      let errorMessage = "Transfer failed";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (error.message?.includes("not owner")) {
        errorMessage = "You don't own this NFT";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState({
        isTransferring: false,
        txHash: null,
        error: errorMessage,
      });

      return null;
    }
  }, [address, isConnected, validateAddress]);

  return {
    ...state,
    transferNFT,
    validateAddress,
    resetState,
  };
}
