import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { THELILYPAD_ABI, THELILYPAD_CONTRACT_ADDRESS } from "@/config/theLilyPad";
import { NFT_COLLECTION_ABI, TheLilyPadPhase } from "@/config/nftFactory";
import { encodeFunctionData } from "viem";
import { getMonadChain, NetworkType } from "@/config/alchemy";
import { toast } from "sonner";

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

interface ContractState {
  isLoading: boolean;
  error: string | null;
}

export function useTheLilyPadContract(targetContractAddress?: string | null) {
  const { address, isConnected, network, switchToMonad, chainId, chainType, getProvider } = useWallet();
  const contractAddress = targetContractAddress || THELILYPAD_CONTRACT_ADDRESS;
  const [state, setState] = useState<ContractState>({
    isLoading: false,
    error: null,
  });

  // Use the collection ABI for deployed collections
  const abi = NFT_COLLECTION_ABI;

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

  // Read contract data
  const readContract = useCallback(async (functionName: string, args: readonly unknown[] = []): Promise<any> => {
    try {
      const data = encodeFunctionData({
        abi,
        functionName: functionName as any,
        args: args as any,
      });

      const result = await rpcProxyCall(network, 'eth_call', [{
        to: contractAddress,
        data,
      }, 'latest']);

      return result;
    } catch (error) {
      console.error(`Error reading ${functionName}:`, error);
      throw error;
    }
  }, [network, contractAddress, abi]);

  // Get phase info
  const getPhase = useCallback(async (phaseId: number): Promise<TheLilyPadPhase | null> => {
    try {
      const result = await readContract('phases', [BigInt(phaseId)]);
      
      // Decode the result (5 values: price, maxPerWallet, maxSupply, minted, requiresAllowlist)
      const price = BigInt('0x' + result.slice(2, 66));
      const maxPerWallet = BigInt('0x' + result.slice(66, 130));
      const maxSupply = BigInt('0x' + result.slice(130, 194));
      const minted = BigInt('0x' + result.slice(194, 258));
      const requiresAllowlist = BigInt('0x' + result.slice(258, 322)) === 1n;

      return { price, maxPerWallet, maxSupply, minted, requiresAllowlist };
    } catch (error) {
      console.error('Error getting phase:', error);
      return null;
    }
  }, [readContract]);

  // Get active phase ID
  const getActivePhase = useCallback(async (): Promise<number> => {
    try {
      const result = await readContract('activePhaseId');
      return Number(BigInt(result));
    } catch (error) {
      console.error('Error getting active phase:', error);
      return 0;
    }
  }, [readContract]);

  // Check if address is allowlisted for phase
  const isAllowlisted = useCallback(async (phaseId: number, userAddress: string): Promise<boolean> => {
    try {
      const result = await readContract('allowlist', [BigInt(phaseId), userAddress]);
      return BigInt(result) === 1n;
    } catch (error) {
      console.error('Error checking allowlist:', error);
      return false;
    }
  }, [readContract]);

  // Get minted count for address in phase
  const getMintedPerPhase = useCallback(async (phaseId: number, userAddress: string): Promise<number> => {
    try {
      const result = await readContract('mintedPerPhase', [BigInt(phaseId), userAddress]);
      return Number(BigInt(result));
    } catch (error) {
      console.error('Error getting minted per phase:', error);
      return 0;
    }
  }, [readContract]);

  // Get total supply
  const getTotalSupply = useCallback(async (): Promise<number> => {
    try {
      const result = await readContract('totalSupply');
      return Number(BigInt(result));
    } catch (error) {
      console.error('Error getting total supply:', error);
      return 0;
    }
  }, [readContract]);

  // Get max supply
  const getMaxSupply = useCallback(async (): Promise<number> => {
    try {
      const result = await readContract('maxSupply');
      return Number(BigInt(result));
    } catch (error) {
      console.error('Error getting max supply:', error);
      return 0;
    }
  }, [readContract]);

  // Owner-only: Configure a phase (5 parameters including requiresAllowlist)
  const configurePhase = useCallback(async (
    phaseId: number,
    priceInEth: string,
    maxPerWallet: number,
    phaseMaxSupply: number,
    requiresAllowlist: boolean = false
  ): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !provider || chainType !== "evm") {
      toast.error("Please connect an EVM wallet");
      return null;
    }

    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      toast.error("Please switch to Monad network");
      return null;
    }

    setState({ isLoading: true, error: null });

    try {
      const priceInWei = BigInt(Math.floor(parseFloat(priceInEth) * 1e18));

      const data = encodeFunctionData({
        abi,
        functionName: "configurePhase",
        args: [BigInt(phaseId), priceInWei, BigInt(maxPerWallet), BigInt(phaseMaxSupply), requiresAllowlist],
      });

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
          gas: "0x30D40", // 200,000
        }],
      });

      await fetchReceiptWithProxy(txHash, network);

      setState({ isLoading: false, error: null });
      toast.success("Phase configured successfully");
      return txHash;

    } catch (error: any) {
      const errorMessage = error.code === 4001 ? "Transaction rejected" : error.message;
      setState({ isLoading: false, error: errorMessage });
      toast.error("Failed to configure phase", { description: errorMessage });
      return null;
    }
  }, [address, isConnected, chainType, network, contractAddress, getProvider, ensureCorrectNetwork, abi]);

  // Owner-only: Set active phase
  const setActivePhase = useCallback(async (phaseId: number): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !provider || chainType !== "evm") {
      toast.error("Please connect an EVM wallet");
      return null;
    }

    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      toast.error("Please switch to Monad network");
      return null;
    }

    setState({ isLoading: true, error: null });

    try {
      const data = encodeFunctionData({
        abi,
        functionName: "setActivePhase",
        args: [BigInt(phaseId)],
      });

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
          gas: "0x1E848", // 125,000
        }],
      });

      await fetchReceiptWithProxy(txHash, network);

      setState({ isLoading: false, error: null });
      toast.success(`Phase ${phaseId} activated`);
      return txHash;

    } catch (error: any) {
      const errorMessage = error.code === 4001 ? "Transaction rejected" : error.message;
      setState({ isLoading: false, error: errorMessage });
      toast.error("Failed to set active phase", { description: errorMessage });
      return null;
    }
  }, [address, isConnected, chainType, network, contractAddress, getProvider, ensureCorrectNetwork, abi]);

  // Owner-only: Set allowlist (3 parameters: phaseId, addresses, status)
  const setAllowlist = useCallback(async (
    phaseId: number,
    addresses: string[],
    status: boolean
  ): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !provider || chainType !== "evm") {
      toast.error("Please connect an EVM wallet");
      return null;
    }

    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      toast.error("Please switch to Monad network");
      return null;
    }

    setState({ isLoading: true, error: null });

    try {
      const data = encodeFunctionData({
        abi,
        functionName: "setAllowlist",
        args: [BigInt(phaseId), addresses as `0x${string}`[], status],
      });

      // Gas scales with address count
      const gasLimit = 50000 + (addresses.length * 25000);

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
          gas: `0x${gasLimit.toString(16)}`,
        }],
      });

      await fetchReceiptWithProxy(txHash, network);

      setState({ isLoading: false, error: null });
      toast.success(`Allowlist updated for ${addresses.length} addresses`);
      return txHash;

    } catch (error: any) {
      const errorMessage = error.code === 4001 ? "Transaction rejected" : error.message;
      setState({ isLoading: false, error: errorMessage });
      toast.error("Failed to set allowlist", { description: errorMessage });
      return null;
    }
  }, [address, isConnected, chainType, network, contractAddress, getProvider, ensureCorrectNetwork, abi]);

  // Owner-only: Set base URI
  const setBaseURI = useCallback(async (baseURI: string): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !provider || chainType !== "evm") {
      toast.error("Please connect an EVM wallet");
      return null;
    }

    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      toast.error("Please switch to Monad network");
      return null;
    }

    setState({ isLoading: true, error: null });

    try {
      const data = encodeFunctionData({
        abi,
        functionName: "setBaseURI",
        args: [baseURI],
      });

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
          gas: "0x30D40", // 200,000
        }],
      });

      await fetchReceiptWithProxy(txHash, network);

      setState({ isLoading: false, error: null });
      toast.success("Base URI updated");
      return txHash;

    } catch (error: any) {
      const errorMessage = error.code === 4001 ? "Transaction rejected" : error.message;
      setState({ isLoading: false, error: errorMessage });
      toast.error("Failed to set base URI", { description: errorMessage });
      return null;
    }
  }, [address, isConnected, chainType, network, contractAddress, getProvider, ensureCorrectNetwork, abi]);

  // Owner-only: Withdraw funds
  const withdraw = useCallback(async (): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !provider || chainType !== "evm") {
      toast.error("Please connect an EVM wallet");
      return null;
    }

    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      toast.error("Please switch to Monad network");
      return null;
    }

    setState({ isLoading: true, error: null });

    try {
      const data = encodeFunctionData({
        abi,
        functionName: "withdraw",
        args: [],
      });

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
          gas: "0x1E848", // 125,000
        }],
      });

      await fetchReceiptWithProxy(txHash, network);

      setState({ isLoading: false, error: null });
      toast.success("Funds withdrawn successfully");
      return txHash;

    } catch (error: any) {
      const errorMessage = error.code === 4001 ? "Transaction rejected" : error.message;
      setState({ isLoading: false, error: errorMessage });
      toast.error("Failed to withdraw", { description: errorMessage });
      return null;
    }
  }, [address, isConnected, chainType, network, contractAddress, getProvider, ensureCorrectNetwork, abi]);

  return {
    ...state,
    contractAddress,
    // Read functions
    getPhase,
    getActivePhase,
    isAllowlisted,
    getMintedPerPhase,
    getTotalSupply,
    getMaxSupply,
    // Write functions (owner only)
    configurePhase,
    setActivePhase,
    setAllowlist,
    setBaseURI,
    withdraw,
  };
}
