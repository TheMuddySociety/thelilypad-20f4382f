import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { THELILYPAD_ABI, THELILYPAD_CONTRACT_ADDRESS } from "@/config/theLilyPad";
import { encodeFunctionData, parseEther } from "viem";
import { supabase } from "@/integrations/supabase/client";
import { getMonadChain, NetworkType } from "@/config/alchemy";
import { toast } from "sonner";

interface MintState {
  isMinting: boolean;
  txHash: string | null;
  error: string | null;
  mintedTokenIds: number[];
}

// RPC Proxy base URL
const RPC_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rpc-proxy`;

// Make RPC call through the proxy
const rpcProxyCall = async (
  network: NetworkType,
  method: string,
  params: any[]
): Promise<any> => {
  const response = await fetch(`${RPC_PROXY_URL}?network=${network}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC Proxy error: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }

  return data.result;
};

// Fetch transaction receipt
const fetchReceiptWithProxy = async (
  txHash: string,
  network: NetworkType,
  maxAttempts = 60
): Promise<any> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const result = await rpcProxyCall(network, 'eth_getTransactionReceipt', [txHash]);
      if (result) return result;
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
  }

  return null;
};

export function useTheLilyPadMint() {
  const { address, isConnected, network, switchToMonad, chainId, chainType, getProvider } = useWallet();
  const [state, setState] = useState<MintState>({
    isMinting: false,
    txHash: null,
    error: null,
    mintedTokenIds: [],
  });

  const resetState = useCallback(() => {
    setState({
      isMinting: false,
      txHash: null,
      error: null,
      mintedTokenIds: [],
    });
  }, []);

  // Ensure wallet is on the correct Monad network
  const ensureCorrectNetwork = useCallback(async (): Promise<boolean> => {
    const provider = getProvider();
    if (!provider || chainType !== "evm") return false;
    
    const targetChain = getMonadChain(network);
    
    if (chainId !== targetChain.id) {
      try {
        await switchToMonad();
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      } catch (error) {
        console.error("Failed to switch network:", error);
        return false;
      }
    }
    return true;
  }, [network, chainId, switchToMonad, chainType, getProvider]);

  // Record transaction to database
  const recordTransaction = useCallback(async (
    txHash: string,
    collectionId: string,
    txType: string,
    quantity: number,
    pricePaid: number,
    status: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("nft_transactions").insert({
      user_id: user.id,
      collection_id: collectionId,
      tx_hash: txHash,
      tx_type: txType,
      quantity,
      price_paid: pricePaid,
      status,
      confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
    });
  }, []);

  // Record minted NFTs to database
  const recordMintedNFTs = useCallback(async (
    txHash: string,
    collectionId: string,
    quantity: number,
    collectionName?: string,
    collectionImage?: string | null
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !address) return;

    const { data: collection } = await supabase
      .from("collections")
      .select("minted")
      .eq("id", collectionId)
      .maybeSingle();

    const startTokenId = (collection?.minted || 0) - quantity + 1;

    const nftsToInsert = Array.from({ length: quantity }, (_, i) => ({
      collection_id: collectionId,
      owner_id: user.id,
      owner_address: address,
      token_id: startTokenId + i,
      name: collectionName ? `${collectionName} #${startTokenId + i}` : null,
      image_url: collectionImage,
      tx_hash: txHash,
      attributes: [],
    }));

    await supabase.from("minted_nfts").insert(nftsToInsert);
  }, [address]);

  // Mint with allowlist (requires Merkle proof - uses mint function)
  const mintWithAllowlist = useCallback(async (
    quantity: number,
    pricePerNft: string,
    proof: `0x${string}`[] = [],
    collectionId?: string,
    collectionName?: string,
    collectionImage?: string | null
  ): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !provider) {
      setState(prev => ({ ...prev, error: "Wallet not connected" }));
      return null;
    }
    
    if (chainType !== "evm") {
      const errorMsg = "Please switch to an EVM wallet to mint NFTs.";
      setState(prev => ({ ...prev, error: errorMsg }));
      toast.error("EVM Wallet Required", { description: errorMsg });
      return null;
    }

    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      setState(prev => ({ ...prev, error: "Please switch to Monad network" }));
      return null;
    }

    setState({
      isMinting: true,
      txHash: null,
      error: null,
      mintedTokenIds: [],
    });

    try {
      const priceInWei = parseEther(pricePerNft);
      const totalValue = priceInWei * BigInt(quantity);

      // Use mint function with proof for allowlist minting
      const data = encodeFunctionData({
        abi: THELILYPAD_ABI,
        functionName: "mint",
        args: [BigInt(quantity), proof],
      });

      const gasLimit = 200000 + (80000 * quantity);

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: THELILYPAD_CONTRACT_ADDRESS,
          data,
          value: `0x${totalValue.toString(16)}`,
          gas: `0x${gasLimit.toString(16)}`,
        }],
      });

      const receipt = await fetchReceiptWithProxy(txHash, network);

      if (receipt && receipt.status === "0x0") {
        throw new Error("Mint transaction failed");
      }

      if (collectionId) {
        const totalPaid = parseFloat(pricePerNft) * quantity;
        await recordTransaction(txHash, collectionId, "mint", quantity, totalPaid, "confirmed");
        await recordMintedNFTs(txHash, collectionId, quantity, collectionName, collectionImage);
      }

      setState({
        isMinting: false,
        txHash,
        error: null,
        mintedTokenIds: [],
      });

      return txHash;

    } catch (error: any) {
      console.error("Mint error:", error);
      
      let errorMessage = "Minting failed";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas + mint price";
      } else if (error.message?.includes("Not allowlisted")) {
        errorMessage = "Address not on allowlist for this phase";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState({
        isMinting: false,
        txHash: null,
        error: errorMessage,
        mintedTokenIds: [],
      });

      return null;
    }
  }, [address, isConnected, chainType, network, getProvider, ensureCorrectNetwork, recordTransaction, recordMintedNFTs]);

  // Mint public (no proof required - uses mintPublic function)
  const mintPublic = useCallback(async (
    quantity: number,
    pricePerNft: string,
    collectionId?: string,
    collectionName?: string,
    collectionImage?: string | null
  ): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !provider) {
      setState(prev => ({ ...prev, error: "Wallet not connected" }));
      return null;
    }
    
    if (chainType !== "evm") {
      const errorMsg = "Please switch to an EVM wallet to mint NFTs.";
      setState(prev => ({ ...prev, error: errorMsg }));
      toast.error("EVM Wallet Required", { description: errorMsg });
      return null;
    }

    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      setState(prev => ({ ...prev, error: "Please switch to Monad network" }));
      return null;
    }

    setState({
      isMinting: true,
      txHash: null,
      error: null,
      mintedTokenIds: [],
    });

    try {
      const priceInWei = parseEther(pricePerNft);
      const totalValue = priceInWei * BigInt(quantity);

      // Use mintPublic function for public minting
      const data = encodeFunctionData({
        abi: THELILYPAD_ABI,
        functionName: "mintPublic",
        args: [BigInt(quantity)],
      });

      const gasLimit = 200000 + (80000 * quantity);

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: THELILYPAD_CONTRACT_ADDRESS,
          data,
          value: `0x${totalValue.toString(16)}`,
          gas: `0x${gasLimit.toString(16)}`,
        }],
      });

      const receipt = await fetchReceiptWithProxy(txHash, network);

      if (receipt && receipt.status === "0x0") {
        throw new Error("Mint transaction failed");
      }

      if (collectionId) {
        const totalPaid = parseFloat(pricePerNft) * quantity;
        await recordTransaction(txHash, collectionId, "mint", quantity, totalPaid, "confirmed");
        await recordMintedNFTs(txHash, collectionId, quantity, collectionName, collectionImage);
      }

      setState({
        isMinting: false,
        txHash,
        error: null,
        mintedTokenIds: [],
      });

      return txHash;

    } catch (error: any) {
      console.error("Mint public error:", error);
      
      let errorMessage = "Minting failed";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas + mint price";
      } else if (error.message?.includes("Phase not active")) {
        errorMessage = "Public minting is not active";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState({
        isMinting: false,
        txHash: null,
        error: errorMessage,
        mintedTokenIds: [],
      });

      return null;
    }
  }, [address, isConnected, chainType, network, getProvider, ensureCorrectNetwork, recordTransaction, recordMintedNFTs]);

  return {
    ...state,
    mintWithAllowlist,
    mintPublic,
    resetState,
    contractAddress: THELILYPAD_CONTRACT_ADDRESS,
  };
}
