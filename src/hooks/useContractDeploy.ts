import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { 
  NFT_FACTORY_ADDRESS, 
  NFT_FACTORY_ABI, 
  FactoryDeployParams,
  isFactoryConfigured,
  LILYPAD_PLATFORM_NAME,
  LILYPAD_PLATFORM_VERSION
} from "@/config/nftFactory";
import { encodeFunctionData, decodeEventLog } from "viem";

interface DeploymentState {
  isDeploying: boolean;
  deploymentStep: "idle" | "preparing" | "confirming" | "deploying" | "success" | "error";
  txHash: string | null;
  contractAddress: string | null;
  error: string | null;
  isVerified: boolean;
}

// Legacy interface for backwards compatibility
export interface DeployParams {
  name: string;
  symbol: string;
  maxSupply: number;
  royaltyBps: number;
  royaltyReceiver: string;
}

// Extended deployment result with LilyPad info
export interface DeploymentResult {
  contractAddress: string;
  txHash: string;
  isLilyPadVerified: boolean;
  platform: string;
  version: string;
}

export function useContractDeploy() {
  const { address, isConnected, currentChain, chainType, getProvider } = useWallet();
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

  const deployContract = useCallback(async (params: DeployParams): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !provider) {
      setState(prev => ({ ...prev, error: "Wallet not connected" }));
      return null;
    }
    
    if (chainType !== "evm") {
      setState(prev => ({ ...prev, error: "Please switch to an EVM wallet to deploy contracts" }));
      return null;
    }

    // Check if factory is configured
    if (!isFactoryConfigured()) {
      setState(prev => ({ 
        ...prev, 
        error: "LilyPad NFT Factory not yet deployed on Monad Testnet. Please check back soon or deploy manually via Remix/Hardhat." 
      }));
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
      // Encode the createCollection function call
      const callData = encodeFunctionData({
        abi: NFT_FACTORY_ABI,
        functionName: 'createCollection',
        args: [
          params.name,
          params.symbol,
          BigInt(params.maxSupply),
          BigInt(Math.round(params.royaltyBps * 100)), // Convert percentage to basis points
          params.royaltyReceiver as `0x${string}`
        ]
      });

      setState(prev => ({ ...prev, deploymentStep: "confirming" }));

      // Send transaction to factory contract
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: NFT_FACTORY_ADDRESS,
          data: callData,
        }],
      });

      setState(prev => ({ 
        ...prev, 
        deploymentStep: "deploying",
        txHash 
      }));

      // Wait for transaction receipt
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 60;

      while (!receipt && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          receipt = await provider.request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
          });
        } catch (e) {
          // Receipt not available yet, continue waiting
        }
        attempts++;
      }

      if (!receipt) {
        throw new Error("Transaction timeout - please check the explorer for status");
      }

      if (receipt.status === "0x0") {
        throw new Error("Transaction failed - the factory may have rejected the parameters");
      }

      // Parse logs to find the LilyPadCollectionDeployed or CollectionCreated event
      let contractAddress: string | null = null;
      let isVerified = false;
      
      if (receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          try {
            // Try to decode the LilyPadCollectionDeployed event first
            const decoded = decodeEventLog({
              abi: NFT_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            }) as { eventName: string; args: Record<string, unknown> };
            
            if (decoded.eventName === 'LilyPadCollectionDeployed' && decoded.args) {
              contractAddress = decoded.args.collection as string;
              isVerified = true; // LilyPad verified collection
              console.log(`LilyPad Collection Deployed: ${contractAddress}`);
              break;
            }
            
            // Fallback to CollectionCreated for backwards compatibility
            if (decoded.eventName === 'CollectionCreated' && decoded.args) {
              contractAddress = decoded.args.collection as string;
              isVerified = true;
              break;
            }
          } catch {
            // Not the event we're looking for, continue
          }
        }
      }

      // Fallback: If we couldn't parse the event, check if there's a created contract
      // Some factories return the address in the first log topic
      if (!contractAddress && receipt.logs && receipt.logs.length > 0) {
        const firstLog = receipt.logs[0];
        if (firstLog.topics && firstLog.topics.length > 1) {
          // The collection address might be in the first indexed topic
          const potentialAddress = "0x" + firstLog.topics[1].slice(26);
          if (potentialAddress.length === 42) {
            contractAddress = potentialAddress;
          }
        }
      }

      if (!contractAddress) {
        // Last resort: return a placeholder indicating success but address needs manual lookup
        console.warn("Could not parse collection address from logs, transaction succeeded");
        contractAddress = "pending-verification";
      }

      setState({
        isDeploying: false,
        deploymentStep: "success",
        txHash,
        contractAddress,
        error: null,
        isVerified,
      });

      return contractAddress;

    } catch (error: any) {
      console.error("Deployment error:", error);
      
      let errorMessage = "Deployment failed";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.code === -32000) {
        errorMessage = "Insufficient funds for gas";
      } else if (error.code === -32603) {
        errorMessage = "Internal error - the LilyPad factory contract may not be available";
      } else if (error.message?.includes("gas")) {
        errorMessage = "Gas estimation failed - ensure you have enough testnet MON";
      } else if (error.message?.includes("nonce")) {
        errorMessage = "Nonce error - please try again";
      } else if (error.message?.includes("execution reverted")) {
        errorMessage = "Factory rejected the request - check parameters";
      } else if (error.message) {
        errorMessage = error.message.length > 100 
          ? error.message.substring(0, 100) + "..." 
          : error.message;
      }

      setState({
        isDeploying: false,
        deploymentStep: "error",
        txHash: null,
        contractAddress: null,
        error: errorMessage,
        isVerified: false,
      });

      return null;
    }
  }, [address, isConnected]);

  return {
    ...state,
    deployContract,
    resetState,
    isFactoryAvailable: isFactoryConfigured(),
    platformName: LILYPAD_PLATFORM_NAME,
    platformVersion: LILYPAD_PLATFORM_VERSION,
  };
}
