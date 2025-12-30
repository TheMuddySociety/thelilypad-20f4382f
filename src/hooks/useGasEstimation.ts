import { useState, useEffect, useCallback, useRef } from "react";
import { encodeFunctionData, parseEther } from "viem";
import { NFT_CONTRACT_ABI } from "@/config/nftContract";
import { useWallet } from "@/providers/WalletProvider";
import { useRpcFailover } from "@/hooks/useRpcFailover";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

interface GasEstimate {
  gasLimit: number;
  gasPrice: number;
  totalGas: number;
}

interface UseGasEstimationProps {
  contractAddress: string | null;
  mintAmount: number;
  pricePerNft: string;
  requiresAllowlist?: boolean;
  allowlistAddresses?: string[];
  generateMerkleProof?: (address: string, addresses: string[]) => string[];
}

interface UseGasEstimationReturn {
  gasEstimate: GasEstimate | null;
  isEstimating: boolean;
  error: string | null;
  refetch: () => void;
}

// RPC provider gas limit (Monad default: 30M for eth_estimateGas)
const RPC_GAS_LIMIT = 30_000_000;
const MONAD_MIN_GAS_PRICE_MON = 100e-9; // 100 gwei in MON

export const useGasEstimation = ({
  contractAddress,
  mintAmount,
  pricePerNft,
  requiresAllowlist = false,
  allowlistAddresses = [],
  generateMerkleProof,
}: UseGasEstimationProps): UseGasEstimationReturn => {
  const { address, isConnected, chainId, network } = useWallet();
  const { currentRpc, executeWithFailover } = useRpcFailover(network);
  
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const estimateGas = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!isConnected || !contractAddress || !address || typeof window.ethereum === "undefined") {
      setGasEstimate(null);
      setError(null);
      return;
    }

    setIsEstimating(true);
    setError(null);

    try {
      // Calculate total price in wei
      const priceInWei = parseEther(pricePerNft);
      const totalValue = priceInWei * BigInt(mintAmount);

      // Encode the appropriate function call
      let data: `0x${string}`;
      if (requiresAllowlist && allowlistAddresses.length > 0 && generateMerkleProof) {
        const proof = generateMerkleProof(address, allowlistAddresses);
        data = encodeFunctionData({
          abi: NFT_CONTRACT_ABI,
          functionName: "mint",
          args: [BigInt(mintAmount), proof as `0x${string}`[]],
        });
      } else {
        data = encodeFunctionData({
          abi: NFT_CONTRACT_ABI,
          functionName: "mintPublic",
          args: [BigInt(mintAmount)],
        });
      }

      // Try gas estimation with RPC failover
      const result = await executeWithFailover(
        async (rpcUrl) => {
          // Use direct RPC call for gas estimation
          const estimateResponse = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: Date.now(),
              method: "eth_estimateGas",
              params: [{
                from: address,
                to: contractAddress,
                data,
                value: `0x${totalValue.toString(16)}`,
              }],
            }),
            signal: abortControllerRef.current?.signal,
          });

          const estimateData = await estimateResponse.json();
          
          if (estimateData.error) {
            // Check for execution revert (contract-level error, not RPC error)
            if (estimateData.error.message?.includes("execution reverted") || estimateData.error.code === 3) {
              return { 
                success: false, 
                contractError: true,
                error: "Transaction may fail - check eligibility" 
              };
            }
            throw new Error(estimateData.error.message || "Gas estimation failed");
          }

          const estimatedGas = parseInt(estimateData.result, 16);

          // Check if gas exceeds RPC provider limit
          if (estimatedGas >= RPC_GAS_LIMIT) {
            return {
              success: false,
              gasLimitExceeded: true,
              actualGas: estimatedGas,
            };
          }

          // Get gas price
          const priceResponse = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: Date.now() + 1,
              method: "eth_gasPrice",
              params: [],
            }),
            signal: abortControllerRef.current?.signal,
          });

          const priceData = await priceResponse.json();
          
          if (priceData.error) {
            throw new Error(priceData.error.message || "Failed to get gas price");
          }

          const gasPriceWei = BigInt(priceData.result);
          const gasPriceMon = Number(gasPriceWei) / 1e18;

          // Add 20% buffer for safety
          const gasLimitWithBuffer = Math.floor(estimatedGas * 1.2);
          
          // Check if buffered gas would exceed RPC limit
          if (gasLimitWithBuffer >= RPC_GAS_LIMIT) {
            return {
              success: true,
              gasLimit: estimatedGas, // Use exact estimate without buffer
              gasPrice: gasPriceMon,
              totalGas: estimatedGas * gasPriceMon,
              warning: "Gas near RPC limit - no safety buffer applied",
            };
          }

          return {
            success: true,
            gasLimit: gasLimitWithBuffer,
            gasPrice: gasPriceMon,
            totalGas: gasLimitWithBuffer * gasPriceMon,
          };
        },
        { silent: true, maxRetries: 3 }
      );

      if (result.gasLimitExceeded) {
        setGasEstimate(null);
        setError(`Transaction requires ${(result.actualGas / 1_000_000).toFixed(1)}M gas, exceeding RPC limit (30M). Try minting fewer NFTs at once.`);
        return;
      }

      if (result.contractError) {
        // Use fallback estimation for contract errors
        const baseGasLimit = 200000;
        const perNftGas = 80000;
        const fallbackGasLimit = baseGasLimit + (perNftGas * mintAmount);
        
        if (fallbackGasLimit >= RPC_GAS_LIMIT) {
          setGasEstimate(null);
          setError(`Estimated gas (~${(fallbackGasLimit / 1_000_000).toFixed(1)}M) exceeds RPC limit (30M). Try minting fewer NFTs.`);
          return;
        }

        setGasEstimate({
          gasLimit: fallbackGasLimit,
          gasPrice: MONAD_MIN_GAS_PRICE_MON,
          totalGas: fallbackGasLimit * MONAD_MIN_GAS_PRICE_MON,
        });
        setError(result.error);
        return;
      }

      if (result.success) {
        setGasEstimate({
          gasLimit: result.gasLimit,
          gasPrice: result.gasPrice,
          totalGas: result.totalGas,
        });
        setError(result.warning || null);
      }
    } catch (err: any) {
      console.error("Gas estimation failed:", err);
      
      // Check for abort
      if (err.name === "AbortError") {
        return;
      }

      // Check for RPC-specific gas limit errors
      const errorMsg = err.message?.toLowerCase() || "";
      if (
        errorMsg.includes("gas limit") ||
        errorMsg.includes("exceeds allowance") ||
        errorMsg.includes("out of gas") ||
        errorMsg.includes("gas required exceeds")
      ) {
        setGasEstimate(null);
        setError("Transaction exceeds RPC gas limit (30M). Try minting fewer NFTs at once.");
        return;
      }

      // Fallback to estimated values
      const baseGasLimit = 200000;
      const perNftGas = 80000;
      const fallbackGasLimit = baseGasLimit + (perNftGas * mintAmount);
      
      if (fallbackGasLimit >= RPC_GAS_LIMIT) {
        setGasEstimate(null);
        setError(`Estimated gas (~${(fallbackGasLimit / 1_000_000).toFixed(1)}M) exceeds RPC limit (30M). Try minting fewer NFTs.`);
        return;
      }

      setGasEstimate({
        gasLimit: fallbackGasLimit,
        gasPrice: MONAD_MIN_GAS_PRICE_MON,
        totalGas: fallbackGasLimit * MONAD_MIN_GAS_PRICE_MON,
      });
      setError("Using estimated gas (live estimate unavailable)");
    } finally {
      setIsEstimating(false);
    }
  }, [
    isConnected,
    contractAddress,
    address,
    mintAmount,
    pricePerNft,
    requiresAllowlist,
    allowlistAddresses,
    generateMerkleProof,
    executeWithFailover,
  ]);

  // Debounced gas estimation
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(estimateGas, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [estimateGas]);

  // Re-estimate when RPC changes
  useEffect(() => {
    estimateGas();
  }, [currentRpc]);

  return {
    gasEstimate,
    isEstimating,
    error,
    refetch: estimateGas,
  };
};
