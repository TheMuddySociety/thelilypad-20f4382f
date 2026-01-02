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
import { toast } from "sonner";

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
      const errorMsg = "Please switch to an EVM wallet to deploy contracts. Open the wallet menu and click 'Switch to EVM' or connect with MetaMask.";
      setState(prev => ({ ...prev, error: errorMsg }));
      toast.error("EVM Wallet Required", { description: errorMsg });
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
      console.log("[Deploy] Starting contract deployment...", params);
      console.log("[Deploy] Factory address:", NFT_FACTORY_ADDRESS);
      console.log("[Deploy] User address:", address);
      
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

      console.log("[Deploy] Call data encoded, requesting gas estimate...");

      // Estimate gas first
      let gasEstimate: string;
      try {
        gasEstimate = await provider.request({
          method: "eth_estimateGas",
          params: [{
            from: address,
            to: NFT_FACTORY_ADDRESS,
            data: callData,
          }],
        });
        console.log("[Deploy] Gas estimate:", gasEstimate, "=", parseInt(gasEstimate, 16));
      } catch (gasError: any) {
        console.error("[Deploy] Gas estimation failed:", gasError);
        throw new Error(`Gas estimation failed: ${gasError?.message || "Contract may be invalid or you lack funds"}`);
      }

      // Add 20% buffer to gas estimate
      const gasLimit = Math.floor(parseInt(gasEstimate, 16) * 1.2);
      console.log("[Deploy] Using gas limit with buffer:", gasLimit);

      setState(prev => ({ ...prev, deploymentStep: "confirming" }));
      console.log("[Deploy] Requesting wallet confirmation...");

      // Send transaction to factory contract with explicit gas limit
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: NFT_FACTORY_ADDRESS,
          data: callData,
          gas: "0x" + gasLimit.toString(16),
        }],
      });

      console.log("[Deploy] Transaction submitted! Hash:", txHash);
      
      setState(prev => ({ 
        ...prev, 
        deploymentStep: "deploying",
        txHash 
      }));

      // Wait for transaction receipt with faster polling
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 90; // 90 attempts * 1 second = 90 seconds max
      const pollInterval = 1000; // Poll every 1 second (faster)

      console.log("[Deploy] Waiting for transaction receipt...");
      
      while (!receipt && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        try {
          receipt = await provider.request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
          });
          if (receipt) {
            console.log("[Deploy] Receipt received after", attempts + 1, "attempts");
          }
        } catch (e) {
          // Receipt not available yet, continue waiting
        }
        attempts++;
        
        // Log progress every 10 attempts
        if (attempts % 10 === 0) {
          console.log(`[Deploy] Still waiting... (${attempts}/${maxAttempts} attempts)`);
        }
      }

      if (!receipt) {
        throw new Error("Transaction timeout - please check the explorer for status");
      }

      if (receipt.status === "0x0") {
        throw new Error("Transaction failed - the factory may have rejected the parameters");
      }

      // Parse logs to find the deployed contract address
      let contractAddress: string | null = null;
      let isVerified = false;
      
      console.log("[Deploy] Parsing logs...", receipt.logs?.length || 0, "logs found");
      
      if (receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          console.log("[Deploy] Log:", { topics: log.topics, data: log.data, address: log.address });
          
          try {
            // Try to decode known events
            const decoded = decodeEventLog({
              abi: NFT_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            }) as { eventName: string; args: Record<string, unknown> };
            
            console.log("[Deploy] Decoded event:", decoded.eventName, decoded.args);
            
            if (decoded.eventName === 'LilyPadCollectionDeployed' && decoded.args) {
              contractAddress = decoded.args.collection as string;
              isVerified = true;
              console.log(`[Deploy] LilyPad Collection Deployed: ${contractAddress}`);
              break;
            }
            
            if (decoded.eventName === 'CollectionCreated' && decoded.args) {
              contractAddress = decoded.args.collection as string;
              isVerified = true;
              console.log(`[Deploy] Collection Created: ${contractAddress}`);
              break;
            }
          } catch {
            // Not a decodable event, try manual parsing
          }
        }
        
        // Fallback 1: Check indexed topics for address
        if (!contractAddress) {
          for (const log of receipt.logs) {
            // Skip if this log is from the factory itself (not from new contract)
            if (log.topics && log.topics.length > 1) {
              // Address in indexed topic (padded to 32 bytes)
              const potentialAddress = "0x" + log.topics[1].slice(-40);
              if (potentialAddress.length === 42 && potentialAddress !== address?.toLowerCase()) {
                contractAddress = potentialAddress;
                isVerified = true;
                console.log(`[Deploy] Found address in topic: ${contractAddress}`);
                break;
              }
            }
          }
        }
        
        // Fallback 2: Parse non-indexed data field (first 32 bytes often contains address)
        if (!contractAddress) {
          for (const log of receipt.logs) {
            if (log.data && log.data.length >= 66) {
              // First 32 bytes of data (after 0x prefix)
              const potentialAddress = "0x" + log.data.slice(26, 66);
              if (potentialAddress.length === 42 && potentialAddress.startsWith("0x")) {
                contractAddress = potentialAddress;
                isVerified = true;
                console.log(`[Deploy] Found address in data: ${contractAddress}`);
                break;
              }
            }
          }
        }
        
        // Fallback 3: If a log was emitted from a new address (not factory), that's likely the new contract
        if (!contractAddress) {
          for (const log of receipt.logs) {
            if (log.address && log.address.toLowerCase() !== NFT_FACTORY_ADDRESS.toLowerCase()) {
              contractAddress = log.address;
              isVerified = true;
              console.log(`[Deploy] Found new contract from log emitter: ${contractAddress}`);
              break;
            }
          }
        }
      }

      // Fallback 4: Check if receipt has contractAddress field (for direct contract creations)
      if (!contractAddress && receipt.contractAddress) {
        contractAddress = receipt.contractAddress;
        isVerified = true;
        console.log(`[Deploy] Found address in receipt.contractAddress: ${contractAddress}`);
      }

      if (!contractAddress) {
        console.warn("[Deploy] Could not parse collection address from logs");
        throw new Error("Contract deployed but address could not be extracted. Check the transaction on explorer: " + txHash);
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
