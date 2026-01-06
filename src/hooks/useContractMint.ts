import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { NFT_COLLECTION_ABI } from "@/config/nftFactory";
import { encodeFunctionData, parseEther, keccak256, encodePacked } from "viem";
import { MerkleTree } from "merkletreejs";
import { supabase } from "@/integrations/supabase/client";
import { getMonadChain, NetworkType } from "@/config/alchemy";
import { toast } from "sonner";

export type MintStep = 'idle' | 'waiting_wallet' | 'submitting' | 'processing' | 'syncing' | 'success' | 'error';

interface MintState {
  isMinting: boolean;
  step: MintStep;
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
    step: 'idle',
    txHash: null,
    error: null,
    mintedTokenIds: [],
  });

  const resetState = useCallback(() => {
    setState({
      isMinting: false,
      step: 'idle',
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
    }
  }, []);

  // Record minted NFTs to database
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

      const { data: collection, error: fetchError } = await supabase
        .from("collections")
        .select("minted, name")
        .eq("id", collectionId)
        .single();

      if (fetchError) throw fetchError;

      const currentMinted = collection?.minted || 0;
      const startTokenId = currentMinted + 1;
      const finalMintedCount = currentMinted + quantity;

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

      const { error: insertError } = await supabase.from("minted_nfts").insert(nftsToInsert);
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("collections")
        .update({ minted: finalMintedCount })
        .eq("id", collectionId);

      if (updateError) throw updateError;

      return Array.from({ length: quantity }, (_, i) => startTokenId + i);
    } catch (err: any) {
      console.error("Error recording minted NFTs:", err);
      toast.error("Database Sync Failed", {
        description: "Your NFTs were minted on-chain but there was an error updating your profile."
      });
      throw err;
    }
  }, [address]);

  // Mint with allowlist
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
      const errorMsg = "Please switch to an EVM wallet to mint NFTs.";
      setState(prev => ({ ...prev, error: errorMsg }));
      return null;
    }

    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      setState(prev => ({ ...prev, error: "Please switch to Monad network" }));
      return null;
    }

    setState({
      isMinting: true,
      step: 'waiting_wallet',
      txHash: null,
      error: null,
      mintedTokenIds: [],
    });

    // Check for Monad "New Account Funding Delay"
    if (isNewAccount && lastFundedAt) {
      const timeSinceFunding = Date.now() - lastFundedAt;
      if (timeSinceFunding < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceFunding));
      }
    }

    try {
      const priceInWei = parseEther(pricePerNft);
      const totalValue = priceInWei * BigInt(quantity);
      const proof = generateMerkleProof(address, allowlistAddresses) as `0x${string}`[];

      const data = encodeFunctionData({
        abi: NFT_COLLECTION_ABI,
        functionName: "mint",
        args: [BigInt(quantity), proof],
      });

      let gasLimit = BigInt(200000 + (80000 * quantity));
      if (customGasLimit) {
        gasLimit = BigInt(customGasLimit);
      } else {
        try {
          const estimatedGas = await provider.request({
            method: "eth_estimateGas",
            params: [{ from: address, to: contractAddress, data, value: `0x${totalValue.toString(16)}` }],
          });
          gasLimit = (BigInt(estimatedGas) * 105n) / 100n;
        } catch (e) {
          gasLimit = BigInt(300000 + (100000 * quantity));
        }
      }

      setState(prev => ({ ...prev, step: 'submitting' }));
      const txHash = await submitTransactionWithRetry(provider, {
        from: address,
        to: contractAddress,
        data,
        value: `0x${totalValue.toString(16)}`,
        gas: `0x${gasLimit.toString(16)}`,
      });

      setState(prev => ({ ...prev, step: 'processing', txHash }));
      const receipt = await fetchReceiptWithProxy(txHash, network);

      if (receipt && receipt.status === "0x0") throw new Error("Transaction reverted on-chain");

      setState(prev => ({ ...prev, step: 'syncing' }));

      let tokenIds: number[] = [];
      if (collectionId) {
        const totalPaid = parseFloat(pricePerNft) * quantity;
        await recordTransaction(txHash, collectionId, "mint", quantity, totalPaid, "confirmed");
        tokenIds = await recordMintedNFTs(txHash, collectionId, quantity, collectionName, collectionImage) || [];
      }

      setState({
        isMinting: false,
        step: 'success',
        txHash,
        error: null,
        mintedTokenIds: tokenIds,
      });

      return txHash;
    } catch (error: any) {
      console.error("Mint error:", error);
      const errorMessage = error.code === 4001 ? "Transaction rejected" : (error.message || "Minting failed");
      setState({ isMinting: false, step: 'error', txHash: null, error: errorMessage, mintedTokenIds: [] });
      return null;
    }
  }, [address, isConnected, contractAddress, recordTransaction, recordMintedNFTs, ensureCorrectNetwork, isNewAccount, lastFundedAt]);

  // Mint public
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

    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      setState(prev => ({ ...prev, error: "Please switch to Monad network" }));
      return null;
    }

    setState({
      isMinting: true,
      step: 'waiting_wallet',
      txHash: null,
      error: null,
      mintedTokenIds: [],
    });

    // Check for Monad "New Account Funding Delay"
    if (isNewAccount && lastFundedAt) {
      const timeSinceFunding = Date.now() - lastFundedAt;
      if (timeSinceFunding < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceFunding));
      }
    }

    try {
      const priceInWei = parseEther(pricePerNft);
      const totalValue = priceInWei * BigInt(quantity);
      const data = encodeFunctionData({
        abi: NFT_COLLECTION_ABI,
        functionName: "mintPublic",
        args: [BigInt(quantity)],
      });

      let gasLimit = BigInt(200000 + (80000 * quantity));
      if (customGasLimit) {
        gasLimit = BigInt(customGasLimit);
      } else {
        try {
          const estimatedGas = await provider.request({
            method: "eth_estimateGas",
            params: [{ from: address, to: contractAddress, data, value: `0x${totalValue.toString(16)}` }],
          });
          gasLimit = (BigInt(estimatedGas) * 105n) / 100n;
        } catch (e) {
          gasLimit = BigInt(300000 + (100000 * quantity));
        }
      }

      setState(prev => ({ ...prev, step: 'submitting' }));
      const txHash = await submitTransactionWithRetry(provider, {
        from: address,
        to: contractAddress,
        data,
        value: `0x${totalValue.toString(16)}`,
        gas: `0x${gasLimit.toString(16)}`,
      });

      setState(prev => ({ ...prev, step: 'processing', txHash }));
      const receipt = await fetchReceiptWithProxy(txHash, network);

      if (receipt && receipt.status === "0x0") throw new Error("Transaction reverted on-chain");

      setState(prev => ({ ...prev, step: 'syncing' }));

      let tokenIds: number[] = [];
      if (collectionId) {
        const totalPaid = parseFloat(pricePerNft) * quantity;
        await recordTransaction(txHash, collectionId, "mint", quantity, totalPaid, "confirmed");
        tokenIds = await recordMintedNFTs(txHash, collectionId, quantity, collectionName, collectionImage) || [];
      }

      setState({
        isMinting: false,
        step: 'success',
        txHash,
        error: null,
        mintedTokenIds: tokenIds,
      });

      return txHash;
    } catch (error: any) {
      console.error("Mint error:", error);
      const errorMessage = error.code === 4001 ? "Transaction rejected" : (error.message || "Minting failed");
      setState({ isMinting: false, step: 'error', txHash: null, error: errorMessage, mintedTokenIds: [] });
      return null;
    }
  }, [address, isConnected, contractAddress, recordTransaction, recordMintedNFTs, ensureCorrectNetwork, isNewAccount, lastFundedAt]);

  const canAffordMint = useCallback((quantity: number, pricePerNft: string): boolean => {
    if (!balance) return false;
    const userBalance = parseFloat(balance);
    const totalCost = parseFloat(pricePerNft) * quantity;
    return userBalance >= totalCost + 0.001;
  }, [balance]);

  return {
    ...state,
    mintWithAllowlist,
    mintPublic,
    generateMerkleProof,
    verifyAllowlist,
    canAffordMint,
    resetState,
  };
}
