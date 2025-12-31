import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { NFT_CONTRACT_ABI } from "@/config/nftContract";
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
  
  // Log which RPC was used (from headers)
  const rpcUsed = response.headers.get('X-RPC-Used');
  const latency = response.headers.get('X-RPC-Latency');
  if (rpcUsed) {
    console.log(`RPC Proxy: ${method} via ${rpcUsed} (${latency}ms)`);
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
        return result;
      }

      // Receipt not ready yet, continue polling
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error('Receipt fetch error:', error);
      
      // Continue polling on error (proxy handles failover internally)
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
  }

  return null;
};

export function useContractMint(contractAddress: string | null) {
  const { address, isConnected, balance, network, switchToMonad, chainId, chainType, getProvider } = useWallet();
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
        // Wait a moment for the network switch to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      } catch (error) {
        console.error("Failed to switch network:", error);
        return false;
      }
    }
    return true;
  }, [network, chainId, switchToMonad]);

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

    // Get current minted count to calculate token IDs
    const { data: collection } = await supabase
      .from("collections")
      .select("minted")
      .eq("id", collectionId)
      .maybeSingle();

    const startTokenId = (collection?.minted || 0) - quantity + 1;

    // Insert minted NFTs
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

  // Mint with allowlist (requires proof)
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

    // Ensure we're on the correct Monad network
    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      setState(prev => ({ ...prev, error: "Please switch to Monad network" }));
      return null;
    }

    // Verify user is on allowlist
    if (!verifyAllowlist(address, allowlistAddresses)) {
      setState(prev => ({ ...prev, error: "Address not on allowlist" }));
      return null;
    }

    setState({
      isMinting: true,
      txHash: null,
      error: null,
      mintedTokenIds: [],
    });

    try {
      // Generate Merkle proof
      const proof = generateMerkleProof(address, allowlistAddresses);

      // Calculate total price in wei
      const priceInWei = parseEther(pricePerNft);
      const totalValue = priceInWei * BigInt(quantity);

      // Encode the mint function call with proof
      const data = encodeFunctionData({
        abi: NFT_CONTRACT_ABI,
        functionName: "mint",
        args: [BigInt(quantity), proof as `0x${string}`[]],
      });

      // Gas limit multipliers for retry attempts (1x, 1.5x, 2x)
      const gasMultipliers = customGasLimit ? [1] : [1, 1.5, 2]; // Skip retries if custom gas limit is set
      const baseGasLimit = 200000;
      const perNftGas = 80000;
      const initialGasLimit = customGasLimit || (baseGasLimit + (perNftGas * quantity));

      let txHash: string | null = null;
      let lastError: any = null;

      // Retry loop with increasing gas limits
      for (let attempt = 0; attempt < gasMultipliers.length; attempt++) {
        const gasLimit = Math.floor(initialGasLimit * gasMultipliers[attempt]);
        
        console.log(`Mint attempt ${attempt + 1}/${gasMultipliers.length} with gas limit: ${gasLimit}`);

        try {
          txHash = await provider.request({
            method: "eth_sendTransaction",
            params: [{
              from: address,
              to: contractAddress,
              data,
              value: `0x${totalValue.toString(16)}`,
              gas: `0x${gasLimit.toString(16)}`,
            }],
          });

          // If we get here, transaction was submitted successfully
          console.log(`Transaction submitted on attempt ${attempt + 1}: ${txHash}`);
          break;

        } catch (error: any) {
          lastError = error;
          console.error(`Attempt ${attempt + 1} failed:`, error.message);

          // Don't retry if user rejected
          if (error.code === 4001) {
            throw error; // User rejected, don't retry
          }
          
          // Check if it's an RPC/network error that might be transient
          const isRpcError = error.code === -32080 || 
                            error.message?.includes('RPC') ||
                            error.message?.includes('HTTP') ||
                            error.message?.includes('403') ||
                            error.message?.includes('network') ||
                            error.data?.httpStatus === 403;
          
          // Check if it's a gas-related error
          const isGasError = error.message?.toLowerCase().includes('gas') ||
                            error.message?.toLowerCase().includes('intrinsic') ||
                            error.message?.toLowerCase().includes('exceeds');
          
          const shouldRetry = isGasError || isRpcError;
          
          if (!shouldRetry || attempt === gasMultipliers.length - 1) {
            throw error; // Not retryable or last attempt
          }

          // Update state to show retry attempt
          const retryReason = isRpcError ? 'RPC issue' : 'Gas limit issue';
          setState(prev => ({ 
            ...prev, 
            error: `${retryReason}, retrying (attempt ${attempt + 2}/${gasMultipliers.length})...` 
          }));
          
          // Longer delay for RPC errors
          const delay = isRpcError ? 2000 : 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (!txHash) {
        throw lastError || new Error("Failed to submit transaction");
      }

      // Clear retry message
      setState(prev => ({ ...prev, error: null }));

      // Wait for receipt with RPC failover
      const receipt = await fetchReceiptWithProxy(txHash, network);

      if (receipt && receipt.status === "0x0") {
        throw new Error("Mint transaction failed");
      }

      // Record confirmed transaction and minted NFTs
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
      } else if (error.message?.includes("not on allowlist")) {
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
  }, [address, isConnected, contractAddress, generateMerkleProof, verifyAllowlist, recordTransaction, recordMintedNFTs, ensureCorrectNetwork]);

  // Mint public (no proof required)
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

    // Ensure we're on the correct Monad network
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
      // Calculate total price in wei
      const priceInWei = parseEther(pricePerNft);
      const totalValue = priceInWei * BigInt(quantity);

      // Encode the mintPublic function call
      const data = encodeFunctionData({
        abi: NFT_CONTRACT_ABI,
        functionName: "mintPublic",
        args: [BigInt(quantity)],
      });

      // Gas limit multipliers for retry attempts (1x, 1.5x, 2x)
      const gasMultipliers = customGasLimit ? [1] : [1, 1.5, 2]; // Skip retries if custom gas limit is set
      const baseGasLimit = 200000;
      const perNftGas = 80000;
      const initialGasLimit = customGasLimit || (baseGasLimit + (perNftGas * quantity));

      let txHash: string | null = null;
      let lastError: any = null;

      // Retry loop with increasing gas limits
      for (let attempt = 0; attempt < gasMultipliers.length; attempt++) {
        const gasLimit = Math.floor(initialGasLimit * gasMultipliers[attempt]);
        
        console.log(`Mint attempt ${attempt + 1}/${gasMultipliers.length} with gas limit: ${gasLimit}`);

        try {
          txHash = await provider.request({
            method: "eth_sendTransaction",
            params: [{
              from: address,
              to: contractAddress,
              data,
              value: `0x${totalValue.toString(16)}`,
              gas: `0x${gasLimit.toString(16)}`,
            }],
          });

          // If we get here, transaction was submitted successfully
          console.log(`Transaction submitted on attempt ${attempt + 1}: ${txHash}`);
          break;

        } catch (error: any) {
          lastError = error;
          console.error(`Attempt ${attempt + 1} failed:`, error.message);

          // Don't retry if user rejected
          if (error.code === 4001) {
            throw error; // User rejected, don't retry
          }
          
          // Check if it's an RPC/network error that might be transient
          const isRpcError = error.code === -32080 || 
                            error.message?.includes('RPC') ||
                            error.message?.includes('HTTP') ||
                            error.message?.includes('403') ||
                            error.message?.includes('network') ||
                            error.data?.httpStatus === 403;
          
          // Check if it's a gas-related error
          const isGasError = error.message?.toLowerCase().includes('gas') ||
                            error.message?.toLowerCase().includes('intrinsic') ||
                            error.message?.toLowerCase().includes('exceeds');
          
          const shouldRetry = isGasError || isRpcError;
          
          if (!shouldRetry || attempt === gasMultipliers.length - 1) {
            throw error; // Not retryable or last attempt
          }

          // Update state to show retry attempt
          const retryReason = isRpcError ? 'RPC issue' : 'Gas limit issue';
          setState(prev => ({ 
            ...prev, 
            error: `${retryReason}, retrying (attempt ${attempt + 2}/${gasMultipliers.length})...` 
          }));
          
          // Longer delay for RPC errors
          const delay = isRpcError ? 2000 : 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (!txHash) {
        throw lastError || new Error("Failed to submit transaction");
      }

      // Clear retry message
      setState(prev => ({ ...prev, error: null }));

      // Wait for receipt with RPC failover
      const receipt = await fetchReceiptWithProxy(txHash, network);

      if (receipt && receipt.status === "0x0") {
        throw new Error("Mint transaction failed");
      }

      // Record confirmed transaction and minted NFTs
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
    const estimatedGas = 0.001; // Conservative gas estimate
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
