import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { NFT_CONTRACT_ABI } from "@/config/nftContract";
import { encodeFunctionData, parseEther, keccak256, encodePacked } from "viem";
import { MerkleTree } from "merkletreejs";

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
  const { address, isConnected, balance } = useWallet();
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

  // Mint with allowlist (requires proof)
  const mintWithAllowlist = useCallback(async (
    quantity: number,
    pricePerNft: string,
    allowlistAddresses: string[]
  ): Promise<string | null> => {
    if (!isConnected || !address || !contractAddress || typeof window.ethereum === "undefined") {
      setState(prev => ({ ...prev, error: "Wallet or contract not connected" }));
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

      setState({
        isMinting: false,
        txHash,
        error: null,
        mintedTokenIds: [], // Would parse from logs in production
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
  }, [address, isConnected, contractAddress, generateMerkleProof, verifyAllowlist]);

  // Mint public (no proof required)
  const mintPublic = useCallback(async (
    quantity: number,
    pricePerNft: string
  ): Promise<string | null> => {
    if (!isConnected || !address || !contractAddress || typeof window.ethereum === "undefined") {
      setState(prev => ({ ...prev, error: "Wallet or contract not connected" }));
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
  }, [address, isConnected, contractAddress]);

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
  };
}
