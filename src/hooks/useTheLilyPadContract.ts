import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import { THELILYPAD_CONTRACT_ADDRESS } from "@/config/theLilyPad";
import { NFT_COLLECTION_ABI, TheLilyPadPhase } from "@/config/nftFactory";
import { encodeFunctionData, createPublicClient, http, formatEther } from "viem";
import { getMonadChain, NetworkType } from "@/config/alchemy";
import { toast } from "sonner";

// RPC Proxy base URL (unused for reads now, we use publicClient directly for speed)
// But kept for potential write-throughs if needed.
const RPC_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rpc-proxy`;

// Fetch transaction receipt through proxy to leverage server-side polling / health checks
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
        // Monad Asynchronous Execution Tip: Wait for indexing
        await new Promise(resolve => setTimeout(resolve, 400));
        return data.result;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
  }
  return null;
};

interface ContractState {
  isLoading: boolean;
  error: string | null;
}

export function useTheLilyPadContract(targetContractAddress?: string | null) {
  const { address, isConnected, network, switchToMonad, chainId, chainType, getProvider, currentChain } = useWallet();
  const contractAddress = (targetContractAddress || THELILYPAD_CONTRACT_ADDRESS) as `0x${string}`;
  const [state, setState] = useState<ContractState>({
    isLoading: false,
    error: null,
  });

  const abi = NFT_COLLECTION_ABI;

  // Initialize Public Client
  const getPublicClient = useCallback(() => {
    return createPublicClient({
      chain: currentChain,
      transport: http()
    });
  }, [currentChain]);

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

  /**
   * Batch read global contract state.
   * Optimized for Monad to reduce round trips.
   */
  const getCollectionState = useCallback(async () => {
    const client = getPublicClient();
    try {
      const contracts = [
        { address: contractAddress, abi, functionName: 'activePhaseId' },
        { address: contractAddress, abi, functionName: 'paused' },
        { address: contractAddress, abi, functionName: 'totalSupply' },
        { address: contractAddress, abi, functionName: 'maxSupply' },
      ];

      const results = await client.multicall({
        contracts: contracts as any,
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11'
      });

      return {
        activePhaseId: results[0]?.status === 'success' ? Number(results[0].result as bigint) : 0,
        isPaused: results[1]?.status === 'success' ? (results[1].result as boolean) : false,
        totalSupply: results[2]?.status === 'success' ? Number(results[2].result as bigint) : 0,
        maxSupply: results[3]?.status === 'success' ? Number(results[3].result as bigint) : 0,
      };
    } catch (error) {
      console.error("Error batch reading collection state:", error);
      return null;
    }
  }, [contractAddress, abi, getPublicClient]);

  // Legacy/Single read functions updated to use public client for better types
  const readContract = useCallback(async (functionName: string, args: readonly unknown[] = []): Promise<any> => {
    const client = getPublicClient();
    try {
      const result = await client.readContract({
        address: contractAddress,
        abi,
        functionName: functionName as any,
        args: args as any,
      });
      return result;
    } catch (error) {
      console.error(`Error reading ${functionName}:`, error);
      throw error;
    }
  }, [contractAddress, abi, getPublicClient]);

  // Get phase info
  const getPhase = useCallback(async (phaseId: number): Promise<TheLilyPadPhase | null> => {
    try {
      const result = await readContract('phases', [BigInt(phaseId)]) as [bigint, bigint, bigint, bigint, boolean];
      const [price, maxPerWallet, maxSupply, minted, requiresAllowlist] = result;
      return { price, maxPerWallet, maxSupply, minted, requiresAllowlist };
    } catch (error) {
      console.error('Error getting phase:', error);
      return null;
    }
  }, [readContract]);

  // Individual wrappers (maintained for compatibility)
  const getActivePhase = useCallback(async (): Promise<number> => {
    try {
      const result = await readContract('activePhaseId');
      return Number(result);
    } catch { return 0; }
  }, [readContract]);

  const getTotalSupply = useCallback(async (): Promise<number> => {
    try {
      const result = await readContract('totalSupply');
      return Number(result);
    } catch { return 0; }
  }, [readContract]);

  const getMaxSupply = useCallback(async (): Promise<number> => {
    try {
      const result = await readContract('maxSupply');
      return Number(result);
    } catch { return 0; }
  }, [readContract]);

  const isAllowlisted = useCallback(async (phaseId: number, userAddress: string): Promise<boolean> => {
    try {
      const result = await readContract('allowlist', [BigInt(phaseId), userAddress]);
      return !!result;
    } catch { return false; }
  }, [readContract]);

  const getMintedPerPhase = useCallback(async (phaseId: number, userAddress: string): Promise<number> => {
    try {
      const result = await readContract('mintedPerPhase', [BigInt(phaseId), userAddress]);
      return Number(result);
    } catch { return 0; }
  }, [readContract]);

  // Transaction methods (maintained with dynamic gas estimation + 5% buffer)
  const executeWriteWithGas = async (functionName: string, args: any[], fallbackGas: bigint) => {
    const provider = getProvider();
    if (!isConnected || !address || !provider) throw new Error("Wallet not connected");

    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) throw new Error("Network switch failed");

    setState({ isLoading: true, error: null });
    try {
      const data = encodeFunctionData({ abi, functionName: functionName as any, args });

      let gasLimit = fallbackGas;
      try {
        const estimatedGas = await provider.request({
          method: "eth_estimateGas",
          params: [{ from: address, to: contractAddress, data }],
        });
        gasLimit = (BigInt(estimatedGas) * 105n) / 100n; // 5% buffer
      } catch (err) {
        console.warn(`Gas estimation failed for ${functionName}, using fallback:`, err);
      }

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, to: contractAddress, data, gas: `0x${gasLimit.toString(16)}` }],
      });

      await fetchReceiptWithProxy(txHash, network);
      setState({ isLoading: false, error: null });
      return txHash;
    } catch (error: any) {
      const errorMessage = error.code === 4001 ? "Transaction rejected" : error.message;
      setState({ isLoading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const configurePhase = useCallback(async (
    phaseId: number, priceInEth: string, maxPerWallet: number, phaseMaxSupply: number, requiresAllowlist = false
  ) => {
    const priceInWei = BigInt(Math.floor(parseFloat(priceInEth) * 1e18));
    return executeWriteWithGas("configurePhase", [BigInt(phaseId), priceInWei, BigInt(maxPerWallet), BigInt(phaseMaxSupply), requiresAllowlist], 300000n)
      .then(tx => { toast.success("Phase configured successfully"); return tx; })
      .catch(err => { toast.error("Failed to configure phase", { description: err.message }); return null; });
  }, [address, isConnected, network, contractAddress, getProvider, ensureCorrectNetwork, abi]);

  const setActivePhase = useCallback(async (phaseId: number) => {
    return executeWriteWithGas("setActivePhase", [BigInt(phaseId)], 150000n)
      .then(tx => { toast.success(`Phase ${phaseId} activated`); return tx; })
      .catch(err => { toast.error("Failed to set active phase", { description: err.message }); return null; });
  }, [address, isConnected, network, contractAddress, getProvider, ensureCorrectNetwork, abi]);

  const setAllowlist = useCallback(async (phaseId: number, addresses: string[], status: boolean) => {
    const fallbackGas = BigInt(100000 + (addresses.length * 30000));
    return executeWriteWithGas("setAllowlist", [BigInt(phaseId), addresses as `0x${string}`[], status], fallbackGas)
      .then(tx => { toast.success(`Allowlist updated for ${addresses.length} addresses`); return tx; })
      .catch(err => { toast.error("Failed to set allowlist", { description: err.message }); return null; });
  }, [address, isConnected, network, contractAddress, getProvider, ensureCorrectNetwork, abi]);

  const setBaseURI = useCallback(async (baseURI: string) => {
    return executeWriteWithGas("setBaseURI", [baseURI], 300000n)
      .then(tx => { toast.success("Base URI updated"); return tx; })
      .catch(err => { toast.error("Failed to set base URI", { description: err.message }); return null; });
  }, [address, isConnected, network, contractAddress, getProvider, ensureCorrectNetwork, abi]);

  const withdraw = useCallback(async () => {
    return executeWriteWithGas("withdraw", [], 150000n)
      .then(tx => { toast.success("Funds withdrawn successfully"); return tx; })
      .catch(err => { toast.error("Failed to withdraw", { description: err.message }); return null; });
  }, [address, isConnected, network, contractAddress, getProvider, ensureCorrectNetwork, abi]);

  return {
    ...state,
    contractAddress,
    getCollectionState,
    getPhase,
    getActivePhase,
    isAllowlisted,
    getMintedPerPhase,
    getTotalSupply,
    getMaxSupply,
    configurePhase,
    setActivePhase,
    setAllowlist,
    setBaseURI,
    withdraw,
  };
}
