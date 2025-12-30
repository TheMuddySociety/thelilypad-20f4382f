import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { NFT_CONTRACT_ABI } from "@/config/nftContract";
import { encodeFunctionData, parseEther, keccak256, encodePacked } from "viem";
import { MerkleTree } from "merkletreejs";
import { supabase } from "@/integrations/supabase/client";
import { getMonadChain, NetworkType } from "@/config/alchemy";

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

export function useContractMint(contractAddress: string | null) {
  const { address, isConnected, balance, network, switchToMonad, chainId } = useWallet();
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
    if (typeof window.ethereum === "undefined") return false;
    
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
    collectionImage?: string | null
  ): Promise<string | null> => {
    if (!isConnected || !address || !contractAddress || typeof window.ethereum === "undefined") {
      setState(prev => ({ ...prev, error: "Wallet or contract not connected" }));
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

      // Send transaction
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
          value: `0x${totalValue.toString(16)}`,
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
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas + mint price";
      } else if (error.message?.includes("not on allowlist")) {
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
  }, [address, isConnected, contractAddress, generateMerkleProof, verifyAllowlist, recordTransaction, recordMintedNFTs, ensureCorrectNetwork]);

  // Mint public (no proof required)
  const mintPublic = useCallback(async (
    quantity: number,
    pricePerNft: string,
    collectionId?: string,
    collectionName?: string,
    collectionImage?: string | null
  ): Promise<string | null> => {
    if (!isConnected || !address || !contractAddress || typeof window.ethereum === "undefined") {
      setState(prev => ({ ...prev, error: "Wallet or contract not connected" }));
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

      // Send transaction
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
          value: `0x${totalValue.toString(16)}`,
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
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas + mint price";
      } else if (error.message?.includes("max supply")) {
        errorMessage = "Max supply reached";
      } else if (error.message?.includes("max per wallet")) {
        errorMessage = "Max per wallet limit reached";
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
