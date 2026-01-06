import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import {
  NFT_FACTORY_ADDRESS,
  NFT_FACTORY_ABI,
  isFactoryConfigured,
  LILYPAD_PLATFORM_NAME,
  LILYPAD_PLATFORM_VERSION,
} from "@/config/nftFactory";
import { encodeFunctionData, decodeEventLog } from "viem";
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

// Fetch transaction receipt with polling
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

interface DeploymentState {
  isDeploying: boolean;
  deploymentStep: "idle" | "preparing" | "confirming" | "deploying" | "success" | "error";
  txHash: string | null;
  contractAddress: string | null;
  error: string | null;
  isVerified: boolean;
}

export interface DeployParams {
  name: string;
  symbol: string;
  maxSupply: number;
  baseURI?: string;
  // Legacy params (ignored but kept for compatibility)
  royaltyBps?: number;
  royaltyReceiver?: string;
}

export function useContractDeploy() {
  const { address, isConnected, chainType, getProvider, network, chainId, switchToMonad } = useWallet();
  const [state, setState] = useState<DeploymentState>({
    isDeploying: false,
    deploymentStep: "idle",
    txHash: null,
    contractAddress: null,
    error: null,
    isVerified: false,
  });

  const resetState = useCallback(() => {
    setState({
      isDeploying: false,
      deploymentStep: "idle",
      txHash: null,
      contractAddress: null,
      error: null,
      isVerified: false,
    });
  }, []);

  // Ensure wallet is on correct network
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

  const deployContract = useCallback(
    async (params: DeployParams): Promise<string | null> => {
      const provider = getProvider();
      if (!isConnected || !address || !provider) {
        setState((prev) => ({ ...prev, error: "Wallet not connected" }));
        return null;
      }

      if (chainType !== "evm") {
        const errorMsg =
          "Please switch to an EVM wallet to deploy contracts. Open the wallet menu and click 'Switch to EVM' or connect with MetaMask.";
        setState((prev) => ({ ...prev, error: errorMsg }));
        toast.error("EVM Wallet Required", { description: errorMsg });
        return null;
      }

      if (!isFactoryConfigured()) {
        setState((prev) => ({
          ...prev,
          error: "Factory contract not configured. Please use Link Existing Contract.",
        }));
        return null;
      }

      // Ensure correct network
      const networkOk = await ensureCorrectNetwork();
      if (!networkOk) {
        setState((prev) => ({ ...prev, error: "Please switch to Monad network" }));
        toast.error("Please switch to Monad network");
        return null;
      }

      setState({
        isDeploying: true,
        deploymentStep: "preparing",
        txHash: null,
        contractAddress: null,
        error: null,
        isVerified: false,
      });

      try {
        // Encode factory createCollection call
        const data = encodeFunctionData({
          abi: NFT_FACTORY_ABI,
          functionName: "createCollection",
          args: [
            params.name,
            params.symbol,
            BigInt(params.maxSupply),
            params.baseURI || ""
          ],
        });

        setState((prev) => ({ ...prev, deploymentStep: "confirming" }));

        // Send transaction to factory
        // Dynamic Gas Estimation
        let gasLimit = BigInt(5000000); // Default fallback (original hardcoded value)
        try {
          const estimatedGas = await provider.request({
            method: "eth_estimateGas",
            params: [{
              from: address,
              to: NFT_FACTORY_ADDRESS,
              data,
            }],
          });
          gasLimit = (BigInt(estimatedGas) * 120n) / 100n; // 20% buffer
          console.log(`Gas estimated for deployment: ${estimatedGas}, using: ${gasLimit}`);
        } catch (gasError) {
          console.warn("Gas estimation failed for deployment, using fallback:", gasError);
        }

        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [{
            from: address,
            to: NFT_FACTORY_ADDRESS,
            data,
            gas: `0x${gasLimit.toString(16)}`,
          }],
        });

        setState((prev) => ({
          ...prev,
          deploymentStep: "deploying",
          txHash
        }));

        toast.info("Transaction submitted", {
          description: "Waiting for confirmation...",
        });

        // Wait for receipt
        const receipt = await fetchReceiptWithProxy(txHash, network);

        if (!receipt) {
          throw new Error("Transaction receipt not found. Check explorer for status.");
        }

        if (receipt.status === "0x0") {
          throw new Error("Transaction failed on-chain");
        }

        // Parse CollectionCreated event to get deployed address
        let deployedAddress: string | null = null;

        // CollectionCreated event signature
        const eventSignature = "0x" + "CollectionCreated(address,address,string,string,uint256)"
          .split('')
          .reduce((hash, char) => {
            // Simplified - we'll search logs instead
            return hash;
          }, '');

        // Search through logs for the deployed collection address
        if (receipt.logs && receipt.logs.length > 0) {
          for (const log of receipt.logs) {
            // The first topic is the event signature, second is indexed collection address
            if (log.topics && log.topics.length >= 2) {
              // Extract the collection address from the second topic (first indexed param)
              const potentialAddress = "0x" + log.topics[1].slice(26);
              if (potentialAddress.length === 42) {
                deployedAddress = potentialAddress;
                break;
              }
            }
          }
        }

        // Fallback: try to get from return data or use a verification call
        if (!deployedAddress) {
          // Last resort: query factory for creator's collections
          try {
            const collectionsData = encodeFunctionData({
              abi: NFT_FACTORY_ABI,
              functionName: "getCreatorCollections",
              args: [address as `0x${string}`],
            });

            const result = await rpcProxyCall(network, 'eth_call', [{
              to: NFT_FACTORY_ADDRESS,
              data: collectionsData,
            }, 'latest']);

            // Decode array of addresses - get the last one
            if (result && result.length > 130) {
              // Skip offset (64) and length (64), then get addresses
              const dataWithoutPrefix = result.slice(2);
              const length = parseInt(dataWithoutPrefix.slice(64, 128), 16);
              if (length > 0) {
                // Get the last address in the array
                const lastAddressStart = 128 + (length - 1) * 64;
                deployedAddress = "0x" + dataWithoutPrefix.slice(lastAddressStart + 24, lastAddressStart + 64);
              }
            }
          } catch (e) {
            console.error("Failed to query creator collections:", e);
          }
        }

        if (!deployedAddress) {
          // If we still can't find it, return a special value
          setState({
            isDeploying: false,
            deploymentStep: "success",
            txHash,
            contractAddress: null,
            error: null,
            isVerified: true,
          });

          toast.warning("Contract deployed!", {
            description: "Check the explorer to find your contract address in the transaction logs.",
          });

          return "pending-verification";
        }

        setState({
          isDeploying: false,
          deploymentStep: "success",
          txHash,
          contractAddress: deployedAddress,
          error: null,
          isVerified: true,
        });

        toast.success("Contract deployed!", {
          description: `Collection created at ${deployedAddress.slice(0, 10)}...`,
        });

        return deployedAddress;

      } catch (error: any) {
        console.error("Deployment error:", error);

        let errorMessage = "Deployment failed";
        if (error.code === 4001) {
          errorMessage = "Transaction rejected by user";
        } else if (error.message) {
          errorMessage = error.message;
        }

        setState({
          isDeploying: false,
          deploymentStep: "error",
          txHash: state.txHash,
          contractAddress: null,
          error: errorMessage,
          isVerified: false,
        });

        toast.error("Deployment failed", { description: errorMessage });
        return null;
      }
    },
    [address, isConnected, chainType, getProvider, network, ensureCorrectNetwork, state.txHash]
  );

  return {
    ...state,
    deployContract,
    resetState,
    isFactoryAvailable: isFactoryConfigured(),
    platformName: LILYPAD_PLATFORM_NAME,
    platformVersion: LILYPAD_PLATFORM_VERSION,
    factoryAddress: NFT_FACTORY_ADDRESS,
  };
}
