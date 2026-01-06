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

/**
 * Pre-defined gas limits for standard Monad operations to bypass eth_estimateGas latency.
 * Based on observed LilyPad contract behavior + 5% Monad buffer.
 */
const PRESET_GAS_LIMITS = {
  MINT_BASE: 250000n,
  MINT_PER_UNIT: 80000n,
  MINT_PUBLIC_BASE: 200000n,
};

// Generate leaf for Merkle tree (address only)
const generateLeaf = (address: string): string => {
  return keccak256(encodePacked(['address'], [address.toLowerCase() as `0x${string}`]));
};

// Fetch transaction receipt using Supabase RPC proxy (synchronized with useTheLilyPadContract)
const fetchReceiptWithProxy = async (
  txHash: string,
  network: NetworkType,
  maxAttempts = 60
): Promise<any> => {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      const { data, error } = await supabase.functions.invoke(`rpc-proxy?network=${network}`, {
        body: { method: 'eth_getTransactionReceipt', params: [txHash] },
      });
      if (data?.result) {
        // Monad Asynchronous Execution Tip: wait for event indexing
        await new Promise(resolve => setTimeout(resolve, 400));
        return data.result;
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
const getExponentialDelay = (attempt: number, baseDelay = 1000, maxDelay = 15000): number => {
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = delay * 0.2 * Math.random();
  return Math.min(delay + jitter, maxDelay);
};

// Error categorization for retries
const isRetryableRpcError = (error: any): boolean => {
  if (!error) return false;
  const errorCode = error.code;
  const errorMessage = error.message?.toLowerCase() || '';
  if (errorCode === 4001) return false; // User rejected
  const rpcErrorCodes = [-32080, -32603, -32000, -32005];
  if (rpcErrorCodes.includes(errorCode)) return true;
  return /rpc|http|network|timeout|connection|rate limit|429|502|503|504/.test(errorMessage);
};

const isGasError = (error: any): boolean => {
  if (!error) return false;
  const msg = error.message?.toLowerCase() || '';
  return msg.includes('gas') || msg.includes('intrinsic') || msg.includes('exceeds') || msg.includes('underpriced');
};

// Submit transaction with exponential backoff retry logic
const submitTransactionWithRetry = async (
  provider: any,
  txParams: any,
  options: { maxRetries?: number; baseDelay?: number } = {}
): Promise<string> => {
  const { maxRetries = 5, baseDelay = 1000 } = options;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await provider.request({
        method: "eth_sendTransaction",
        params: [txParams],
      });
    } catch (error: any) {
      lastError = error;
      if (error.code === 4001 || (!isRetryableRpcError(error) && !isGasError(error)) || attempt === maxRetries) {
        throw error;
      }
      const delay = getExponentialDelay(attempt, baseDelay);
      console.log(`Retrying transaction in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error('Submission failed');
};

export function useContractMint(contractAddress: string | null) {
  const {
    address, isConnected, balance, network, switchToMonad, chainId, chainType, getProvider, isNewAccount, lastFundedAt
  } = useWallet();

  const [state, setState] = useState<MintState>({
    isMinting: false,
    step: 'idle',
    txHash: null,
    error: null,
    mintedTokenIds: [],
  });

  const resetState = useCallback(() => {
    setState({ isMinting: false, step: 'idle', txHash: null, error: null, mintedTokenIds: [] });
  }, []);

  const ensureCorrectNetwork = useCallback(async (): Promise<boolean> => {
    const provider = getProvider();
    if (!provider || chainType !== "evm") return false;
    const targetChain = getMonadChain(network);
    if (chainId !== targetChain.id) {
      try {
        await switchToMonad();
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      } catch { return false; }
    }
    return true;
  }, [network, chainId, switchToMonad, getProvider, chainType]);

  const recordTransaction = useCallback(async (txHash: string, collectionId: string, quantity: number, pricePaid: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("nft_transactions").insert({
        user_id: user.id, collection_id: collectionId, tx_hash: txHash,
        tx_type: "mint", quantity, price_paid: pricePaid, status: "confirmed",
        confirmed_at: new Date().toISOString()
      });
    } catch (err) { console.error("Error logging tx:", err); }
  }, []);

  const recordMintedNFTs = useCallback(async (txHash: string, collectionId: string, quantity: number, collectionName?: string, collectionImage?: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !address) return;

      const { data: collection } = await supabase.from("collections").select("minted, name").eq("id", collectionId).single();
      const currentMinted = collection?.minted || 0;
      const startTokenId = currentMinted + 1;

      const nfts = Array.from({ length: quantity }, (_, i) => ({
        collection_id: collectionId, owner_id: user.id, owner_address: address,
        token_id: startTokenId + i, tx_hash: txHash, image_url: collectionImage,
        name: collectionName ? `${collectionName} #${startTokenId + i}` : `${collection?.name} #${startTokenId + i}`
      }));

      await supabase.from("minted_nfts").insert(nfts);
      await supabase.from("collections").update({ minted: currentMinted + quantity }).eq("id", collectionId);

      return Array.from({ length: quantity }, (_, i) => startTokenId + i);
    } catch (err) {
      console.error("DB Sync Error:", err);
      toast.error("Database Sync Lag", { description: "NFTs were minted but profile update is pending." });
    }
  }, [address]);

  const internalMint = async (
    quantity: number, pricePerNft: string, functionName: 'mint' | 'mintPublic', args: any[], collectionId?: string, collectionName?: string, collectionImage?: string | null
  ) => {
    const provider = getProvider();
    if (!isConnected || !address || !contractAddress || !provider) {
      setState(prev => ({ ...prev, error: "Please connect your wallet." }));
      return null;
    }

    if (!(await ensureCorrectNetwork())) {
      setState(prev => ({ ...prev, error: "Please switch to Monad network." }));
      return null;
    }

    setState({ isMinting: true, step: 'waiting_wallet', txHash: null, error: null, mintedTokenIds: [] });

    // Handle Monad account funding delay
    if (isNewAccount && lastFundedAt && (Date.now() - lastFundedAt < 1000)) {
      await new Promise(resolve => setTimeout(resolve, 1000 - (Date.now() - lastFundedAt)));
    }

    try {
      const priceInWei = parseEther(pricePerNft);
      const totalValue = priceInWei * BigInt(quantity);
      const data = encodeFunctionData({ abi: NFT_COLLECTION_ABI, functionName, args });

      // Calculate Preset Gas Limit (350k base + 80k per unit)
      // Monad Best Practice: Bypassing estimation for common operations speeds up UX
      let gasLimit = PRESET_GAS_LIMITS.MINT_BASE + (BigInt(quantity) * PRESET_GAS_LIMITS.MINT_PER_UNIT);

      try {
        // Optional: Still estimate gas but use it only if it's broadly within range
        const estimatedGas = await provider.request({
          method: "eth_estimateGas",
          params: [{ from: address, to: contractAddress, data, value: `0x${totalValue.toString(16)}` }],
        });
        gasLimit = (BigInt(estimatedGas) * 105n) / 100n; // Use estimated with 5% buffer if possible
      } catch (e: any) {
        console.warn("Gas estimation failed, using preset:", e.message);
        // If estimation fails due to logic (not funds), we still try with preset
        if (e.message?.toLowerCase().includes('insufficient')) throw new Error("Insufficient funds for mint.");
      }

      setState(prev => ({ ...prev, step: 'submitting' }));
      const txHash = await submitTransactionWithRetry(provider, {
        from: address, to: contractAddress, data, value: `0x${totalValue.toString(16)}`, gas: `0x${gasLimit.toString(16)}`
      });

      setState(prev => ({ ...prev, step: 'processing', txHash }));
      const receipt = await fetchReceiptWithProxy(txHash, network);
      if (receipt && receipt.status === "0x0") throw new Error("Transaction reverted on-chain.");

      setState(prev => ({ ...prev, step: 'syncing' }));
      let tokenIds: number[] = [];
      if (collectionId) {
        await recordTransaction(txHash, collectionId, quantity, parseFloat(pricePerNft) * quantity);
        tokenIds = await recordMintedNFTs(txHash, collectionId, quantity, collectionName, collectionImage) || [];
      }

      setState({ isMinting: false, step: 'success', txHash, error: null, mintedTokenIds: tokenIds });
      return txHash;

    } catch (error: any) {
      const errorMessage = error.code === 4001 ? "Transaction rejected" : (error.message || "Minting failed");
      setState({ isMinting: false, step: 'error', txHash: null, error: errorMessage, mintedTokenIds: [] });
      return null;
    }
  };

  const mintWithAllowlist = useCallback(async (
    quantity: number, pricePerNft: string, allowlistAddresses: string[], collectionId?: string, collectionName?: string, collectionImage?: string | null
  ) => {
    const proof = new MerkleTree(allowlistAddresses.map(addr => generateLeaf(addr)), keccak256, { sortPairs: true })
      .getHexProof(generateLeaf(address!)) as `0x${string}`[];
    return internalMint(quantity, pricePerNft, 'mint', [BigInt(quantity), proof], collectionId, collectionName, collectionImage);
  }, [address, internalMint]);

  const mintPublic = useCallback(async (
    quantity: number, pricePerNft: string, collectionId?: string, collectionName?: string, collectionImage?: string | null
  ) => {
    return internalMint(quantity, pricePerNft, 'mintPublic', [BigInt(quantity)], collectionId, collectionName, collectionImage);
  }, [internalMint]);

  const canAffordMint = useCallback((quantity: number, pricePerNft: string): boolean => {
    if (!balance) return false;
    return parseFloat(balance) >= (parseFloat(pricePerNft) * quantity) + 0.001;
  }, [balance]);

  return {
    ...state,
    mintWithAllowlist,
    mintPublic,
    canAffordMint,
    resetState,
  };
}
