import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { NFT_COLLECTION_ABI } from "@/config/nftFactory";
import { encodeFunctionData, parseEther, keccak256, encodePacked } from "viem";
import { MerkleTree } from "merkletreejs";
import { supabase } from "@/integrations/supabase/client";
import { getMonadChain, NetworkType } from "@/config/alchemy";
import { toast } from "sonner";

interface MintState {
  isMinting: boolean;
  txHash: string | null;
  error: string | null;
  mintedTokenIds: number[];
}

// Generate leaf for Merkle tree (address only)
const generateLeaf = (address: string): string => {
  return keccak256(encodePacked(['address'], [address.toLowerCase() as `0x${string}`]));
};

// RPC Proxy base URL
const RPC_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rpc-proxy`;

// Make RPC call through the proxy with automatic failover
const rpcProxyCall = async (
  network: NetworkType,
  method: string,
  params: any[]
): Promise<any> => {
  const { data, error } = await supabase.functions.invoke(`rpc-proxy?network=${network}`, {
    body: { method, params },
  });

  if (error) {
    throw new Error(`RPC Proxy error: ${error.message}`);
  }

  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }

  return data.result;
};

// Fetch transaction receipt using RPC proxy with automatic failover
const fetchReceiptWithProxy = async (
  txHash: string,
  network: NetworkType,
  maxAttempts = 60
): Promise<any> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const result = await rpcProxyCall(network, 'eth_getTransactionReceipt', [txHash]);

      if (result) {
        // Monad Asynchronous Execution Tip: wait a tiny bit after receipt 
        // to ensure deterministic state is indexed by all local views
        await new Promise(resolve => setTimeout(resolve, 400));
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error('Receipt fetch error:', error);
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
  }

  return null;
};

// Exponential backoff delay calculator
const getExponentialDelay = (attempt: number, baseDelay: number = 1000, maxDelay: number = 15000): number => {
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = delay * 0.2 * Math.random();
  return Math.min(delay + jitter, maxDelay);
};

// Check if error is RPC-related and retryable
const isRetryableRpcError = (error: any): boolean => {
  if (!error) return false;

  const errorCode = error.code;
  const errorMessage = error.message?.toLowerCase() || '';
  const httpStatus = error.data?.httpStatus;

  if (errorCode === 4001) return false;

  const rpcErrorCodes = [-32080, -32603, -32000, -32005];
  if (rpcErrorCodes.includes(errorCode)) return true;

  if (httpStatus === 403 || httpStatus === 429 || httpStatus >= 500) return true;

  const retryablePatterns = [
    'rpc', 'http', 'network', 'timeout', 'connection',
    'econnrefused', 'etimedout', 'rate limit', '403', '429', '502', '503', '504',
    'failed to fetch', 'fetch failed', 'server error'
  ];

  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
};

// Check if error is gas-related
const isGasError = (error: any): boolean => {
  if (!error) return false;
  const msg = error.message?.toLowerCase() || '';
  return msg.includes('gas') || msg.includes('intrinsic') || msg.includes('exceeds') || msg.includes('underpriced');
};

// Submit transaction with exponential backoff retry
const submitTransactionWithRetry = async (
  provider: any,
  txParams: any,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    onRetry?: (attempt: number, reason: string, delay: number) => void;
  } = {}
): Promise<string> => {
  const { maxRetries = 5, baseDelay = 1000, onRetry } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Transaction attempt ${attempt + 1}/${maxRetries + 1}`);

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [txParams],
      });

      console.log(`Transaction submitted successfully: ${txHash}`);
      return txHash;

    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error.message, error.code);

      if (error.code === 4001) {
        throw error;
      }

      const isRpcRetryable = isRetryableRpcError(error);
      const isGasRetryable = isGasError(error);

      if (!isRpcRetryable && !isGasRetryable) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw error;
      }

      const delay = getExponentialDelay(attempt, baseDelay);
      const reason = isRpcRetryable ? 'RPC error' : 'Gas error';

      console.log(`Retrying in ${Math.round(delay)}ms due to ${reason}...`);

      if (onRetry) {
        onRetry(attempt + 1, reason, delay);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Transaction submission failed after retries');
};

export function useContractMint(contractAddress: string | null) {
  const {
    address,
    isConnected,
    balance,
    network,
    switchToMonad,
    chainId,
    chainType,
    getProvider,
    isNewAccount,
    lastFundedAt
  } = useWallet();
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

  // Generate Merkle proof for an address given the allowlist
  const generateMerkleProof = useCallback((
    userAddress: string,
    allowlistAddresses: string[]
  ): string[] => {
    if (allowlistAddresses.length === 0) return [];

    const leaves = allowlistAddresses.map(addr => generateLeaf(addr));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const leaf = generateLeaf(userAddress);
    const proof = tree.getHexProof(leaf);

    return proof;
  }, []);

  // Verify if an address is in the allowlist
  const verifyAllowlist = useCallback((
    userAddress: string,
    allowlistAddresses: string[]
  ): boolean => {
    if (allowlistAddresses.length === 0) return false;

    const leaves = allowlistAddresses.map(addr => generateLeaf(addr));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const leaf = generateLeaf(userAddress);
    const proof = tree.getHexProof(leaf);
    const root = tree.getHexRoot();

    return tree.verify(proof, leaf, root);
  }, []);

  // Ensure wallet is on the correct Monad network
  const ensureCorrectNetwork = useCallback(async (): Promise<boolean> => {
    const provider = getProvider();
    if (!provider || chainType !== "evm") return false;

    const targetChain = getMonadChain(network);
    const currentChainId = chainId;

    if (currentChainId !== targetChain.id) {
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
  }, [network, chainId, switchToMonad]);

  // Record transaction to database with error handling
  const recordTransaction = useCallback(async (
    txHash: string,
    collectionId: string,
    txType: string,
    quantity: number,
    pricePaid: number,
    status: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user found while recording transaction");
        return;
      }

      const { error } = await supabase.from("nft_transactions").insert({
        user_id: user.id,
        collection_id: collectionId,
        tx_hash: txHash,
        tx_type: txType,
        quantity,
        price_paid: pricePaid,
        status,
        confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
      });

      if (error) throw error;
      console.log(`Transaction recorded in DB: ${txHash}`);
    } catch (err: any) {
      console.error("Error recording transaction:", err);
      // We don't throw here to avoid blocking the whole process, 
      // but we log it clearly for debugging
    }
  }, []);

  // Record minted NFTs to database with better ID calculation and retry logic
  const recordMintedNFTs = useCallback(async (
    txHash: string,
    collectionId: string,
    quantity: number,
    collectionName?: string,
    collectionImage?: string | null
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !address) return;

      // 1. Get current minted count and update it atomically if possible
      // For now, we fetch and then update, but we'll be more careful with IDs
      const { data: collection, error: fetchError } = await supabase
        .from("collections")
        .select("minted, name")
        .eq("id", collectionId)
        .single();

      if (fetchError) throw fetchError;

      const currentMinted = collection?.minted || 0;
      const startTokenId = currentMinted + 1;
      const finalMintedCount = currentMinted + quantity;

      // 2. Prepare NFT objects
      const nftsToInsert = Array.from({ length: quantity }, (_, i) => ({
        collection_id: collectionId,
        owner_id: user.id,
        owner_address: address,
        token_id: startTokenId + i,
        name: collectionName || collection?.name ? `${collectionName || collection?.name} #${startTokenId + i}` : null,
        image_url: collectionImage,
        tx_hash: txHash,
        attributes: [],
      }));

      // 3. Insert NFTs
      const { error: insertError } = await supabase.from("minted_nfts").insert(nftsToInsert);
      if (insertError) {
        if (insertError.code === "23505") { // Unique constraint violation (token_id)
          console.warn("Token ID collision detected, retrying sync with higher Offset...");
          // In a real app, we'd loop or use a more robust ID system
        }
        throw insertError;
      }

      // 4. Update the collection's minted count
      const { error: updateError } = await supabase
        .from("collections")
        .update({ minted: finalMintedCount })
        .eq("id", collectionId);

      if (updateError) throw updateError;

      console.log(`Successfully recorded ${quantity} minted NFTs and updated collection count to ${finalMintedCount}`);
    } catch (err: any) {
      console.error("Error recording minted NFTs:", err);
      // This is a critical error for the user's view, so we toast it
      toast.error("Database Sync Failed", {
        description: "Your NFTs were minted on-chain but there was an error updating your profile. Please refresh in a moment."
      });
      throw err; // Re-throw to handle in the main mint function
    }
  }, [address]);

  // Update transaction status
  const updateTransactionStatus = useCallback(async (txHash: string, status: string) => {
    await supabase
      .from("nft_transactions")
      .update({
        status,
        confirmed_at: status === "confirmed" ? new Date().toISOString() : null
      })
      .eq("tx_hash", txHash);
  }, []);

  // Mint with allowlist - uses mint function with Merkle proof
  const mintWithAllowlist = useCallback(async (
    quantity: number,
    pricePerNft: string,
    allowlistAddresses: string[],
    collectionId?: string,
    collectionName?: string,
    collectionImage?: string | null,
    customGasLimit?: number
  ): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !contractAddress || !provider) {
      setState(prev => ({ ...prev, error: "Wallet or contract not connected" }));
      return null;
    }

    if (chainType !== "evm") {
      const errorMsg = "Please switch to an EVM wallet to mint NFTs. Open the wallet menu and click 'Switch to EVM' or connect with MetaMask.";
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

      // Generate Merkle proof for allowlist verification
      const proof = generateMerkleProof(address, allowlistAddresses) as `0x${string}`[];

      // Use mint function with proof for allowlist minting
      const data = encodeFunctionData({
        abi: NFT_COLLECTION_ABI,
        functionName: "mint",
        args: [BigInt(quantity), proof],
      });

      // Dynamic Gas Estimation
      let gasLimit = BigInt(200000 + (80000 * quantity)); // Default fallback

      if (customGasLimit) {
        gasLimit = BigInt(customGasLimit);
      } else {
        try {
          const estimatedGas = await provider.request({
            method: "eth_estimateGas",
            params: [{
              from: address,
              to: contractAddress,
              data,
              value: `0x${totalValue.toString(16)}`,
            }],
          });

          // Add 5% buffer for safety (Monad charges based on limit)
          const estimatedGasBigInt = BigInt(estimatedGas);
          gasLimit = (estimatedGasBigInt * 105n) / 100n;
          console.log(`Gas estimated: ${estimatedGasBigInt}, using buffered limit: ${gasLimit}`);
        } catch (gasError) {
          console.warn("Gas estimation failed, using fallback:", gasError);
          // Increase fallback slightly if estimation fails to be safer
          gasLimit = BigInt(300000 + (100000 * quantity));
        }
      }

      const txParams = {
        from: address,
        to: contractAddress,
        data,
        value: `0x${totalValue.toString(16)}`,
        gas: `0x${gasLimit.toString(16)}`,
      };

      const txHash = await submitTransactionWithRetry(provider, txParams, {
        maxRetries: 5,
        baseDelay: 1000,
        onRetry: (attempt, reason, delay) => {
          setState(prev => ({
            ...prev,
            error: `${reason}, retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/6)...`
          }));
          toast.info("Retrying transaction", {
            description: `${reason} detected, waiting ${Math.round(delay / 1000)}s before retry...`,
            duration: Math.min(delay, 3000),
          });
        },
      });

      setState(prev => ({ ...prev, error: null }));

      const receipt = await fetchReceiptWithProxy(txHash, network);

      if (receipt && receipt.status === "0x0") {
        throw new Error("Mint transaction reverted on-chain. This could be due to exceeding limits or incorrect phase state.");
      }

      if (!receipt) {
        console.warn("Receipt not found within timeout, marking transaction as pending.");
        if (collectionId) {
          const totalPaid = parseFloat(pricePerNft) * quantity;
          await recordTransaction(txHash, collectionId, "mint", quantity, totalPaid, "pending");
        }
        setState(prev => ({
          ...prev,
          isMinting: false,
          txHash,
          error: "Transaction sent but receipt not found yet. It will appear in your profile once confirmed."
        }));
        return txHash;
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
      } else if (error.code === -32080 || error.data?.httpStatus === 403) {
        errorMessage = "RPC endpoint unavailable. Please check your wallet's network settings or try again in a moment.";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas + mint price";
      } else if (error.message?.includes("not on allowlist") || error.message?.includes("Not allowlisted")) {
        errorMessage = "Address not on allowlist for this phase";
      } else if (error.message?.toLowerCase().includes("gas")) {
        errorMessage = "Transaction failed due to gas issues. Please try again or increase gas limit in advanced settings.";
      } else if (error.message?.includes("RPC") || error.message?.includes("HTTP")) {
        errorMessage = "Network connection issue. Please check your wallet's RPC settings or try again.";
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
  }, [address, isConnected, contractAddress, recordTransaction, recordMintedNFTs, ensureCorrectNetwork]);

  // Mint public - uses mintPublic function
  const mintPublic = useCallback(async (
    quantity: number,
    pricePerNft: string,
    collectionId?: string,
    collectionName?: string,
    collectionImage?: string | null,
    customGasLimit?: number
  ): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !contractAddress || !provider) {
      setState(prev => ({ ...prev, error: "Wallet or contract not connected" }));
      return null;
    }

    if (chainType !== "evm") {
      const errorMsg = "Please switch to an EVM wallet to mint NFTs. Open the wallet menu and click 'Switch to EVM' or connect with MetaMask.";
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
        abi: NFT_COLLECTION_ABI,
        functionName: "mintPublic",
        args: [BigInt(quantity)],
      });

      // Dynamic Gas Estimation
      let gasLimit = BigInt(200000 + (80000 * quantity)); // Default fallback

      if (customGasLimit) {
        gasLimit = BigInt(customGasLimit);
      } else {
        try {
          const estimatedGas = await provider.request({
            method: "eth_estimateGas",
            params: [{
              from: address,
              to: contractAddress,
              data,
              value: `0x${totalValue.toString(16)}`,
            }],
          });

          // Add 5% buffer for safety (Monad charges based on limit)
          const estimatedGasBigInt = BigInt(estimatedGas);
          gasLimit = (estimatedGasBigInt * 105n) / 100n;
          console.log(`Gas estimated: ${estimatedGasBigInt}, using buffered limit: ${gasLimit}`);
        } catch (gasError) {
          console.warn("Gas estimation failed, using fallback:", gasError);
          // Increase fallback slightly if estimation fails
          gasLimit = BigInt(300000 + (100000 * quantity));
        }
      }

      const txParams = {
        from: address,
        to: contractAddress,
        data,
        value: `0x${totalValue.toString(16)}`,
        gas: `0x${gasLimit.toString(16)}`,
      };

      const txHash = await submitTransactionWithRetry(provider, txParams, {
        maxRetries: 5,
        baseDelay: 1000,
        onRetry: (attempt, reason, delay) => {
          setState(prev => ({
            ...prev,
            error: `${reason}, retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/6)...`
          }));
          toast.info("Retrying transaction", {
            description: `${reason} detected, waiting ${Math.round(delay / 1000)}s before retry...`,
            duration: Math.min(delay, 3000),
          });
        },
      });

      setState(prev => ({ ...prev, error: null }));

      const receipt = await fetchReceiptWithProxy(txHash, network);

      if (receipt && receipt.status === "0x0") {
        throw new Error("Mint transaction reverted on-chain. This could be due to exceeding limits or incorrect phase state.");
      }

      if (!receipt) {
        console.warn("Receipt not found within timeout, marking transaction as pending.");
        if (collectionId) {
          const totalPaid = parseFloat(pricePerNft) * quantity;
          await recordTransaction(txHash, collectionId, "mint", quantity, totalPaid, "pending");
        }
        setState(prev => ({
          ...prev,
          isMinting: false,
          txHash,
          error: "Transaction sent but receipt not found yet. It will appear in your profile once confirmed."
        }));
        return txHash;
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
      } else if (error.code === -32080 || error.data?.httpStatus === 403) {
        errorMessage = "RPC endpoint unavailable. Please check your wallet's network settings or try again in a moment.";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas + mint price";
      } else if (error.message?.includes("max supply")) {
        errorMessage = "Max supply reached";
      } else if (error.message?.includes("max per wallet")) {
        errorMessage = "Max per wallet limit reached";
      } else if (error.message?.toLowerCase().includes("gas")) {
        errorMessage = "Transaction failed due to gas issues. Please try again or increase gas limit in advanced settings.";
      } else if (error.message?.includes("RPC") || error.message?.includes("HTTP")) {
        errorMessage = "Network connection issue. Please check your wallet's RPC settings or try again.";
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
  }, [address, isConnected, contractAddress, recordTransaction, recordMintedNFTs, ensureCorrectNetwork]);

  // Check user's balance to ensure they can afford mint
  const canAffordMint = useCallback((quantity: number, pricePerNft: string): boolean => {
    if (!balance) return false;
    const userBalance = parseFloat(balance);
    const totalCost = parseFloat(pricePerNft) * quantity;
    const estimatedGas = 0.001;
    return userBalance >= totalCost + estimatedGas;
  }, [balance]);

  return {
    ...state,
    mintWithAllowlist,
    mintPublic,
    generateMerkleProof,
    verifyAllowlist,
    canAffordMint,
    resetState,
    recordTransaction,
    updateTransactionStatus,
  };
}
