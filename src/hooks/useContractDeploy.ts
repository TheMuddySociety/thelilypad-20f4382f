import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { NFT_CONTRACT_ABI, NFT_CONTRACT_BYTECODE, DeployParams, toRoyaltyBps } from "@/config/nftContract";
import { parseEther, encodeAbiParameters, parseAbiParameters } from "viem";

interface DeploymentState {
  isDeploying: boolean;
  deploymentStep: "idle" | "preparing" | "confirming" | "deploying" | "success" | "error";
  txHash: string | null;
  contractAddress: string | null;
  error: string | null;
}

export function useContractDeploy() {
  const { address, isConnected, currentChain } = useWallet();
  const [state, setState] = useState<DeploymentState>({
    isDeploying: false,
    deploymentStep: "idle",
    txHash: null,
    contractAddress: null,
    error: null,
  });

  const resetState = useCallback(() => {
    setState({
      isDeploying: false,
      deploymentStep: "idle",
      txHash: null,
      contractAddress: null,
      error: null,
    });
  }, []);

  const deployContract = useCallback(async (params: DeployParams): Promise<string | null> => {
    if (!isConnected || !address || typeof window.ethereum === "undefined") {
      setState(prev => ({ ...prev, error: "Wallet not connected" }));
      return null;
    }

    setState({
      isDeploying: true,
      deploymentStep: "preparing",
      txHash: null,
      contractAddress: null,
      error: null,
    });

    try {
      // Encode constructor arguments
      const encodedArgs = encodeAbiParameters(
        parseAbiParameters("string, string, uint256, uint256, address"),
        [
          params.name,
          params.symbol,
          BigInt(params.maxSupply),
          BigInt(toRoyaltyBps(params.royaltyBps)),
          params.royaltyReceiver as `0x${string}`
        ]
      );

      // Combine bytecode with encoded constructor args
      const deployData = NFT_CONTRACT_BYTECODE + encodedArgs.slice(2);

      setState(prev => ({ ...prev, deploymentStep: "confirming" }));

      // Send deployment transaction
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          data: deployData,
          // Let the wallet estimate gas
        }],
      });

      setState(prev => ({ 
        ...prev, 
        deploymentStep: "deploying",
        txHash 
      }));

      // Wait for transaction receipt to get contract address
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max wait

      while (!receipt && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          receipt = await window.ethereum.request({
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
        throw new Error("Contract deployment failed");
      }

      const contractAddress = receipt.contractAddress;

      setState({
        isDeploying: false,
        deploymentStep: "success",
        txHash,
        contractAddress,
        error: null,
      });

      return contractAddress;

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
        txHash: null,
        contractAddress: null,
        error: errorMessage,
      });

      return null;
    }
  }, [address, isConnected]);

  return {
    ...state,
    deployContract,
    resetState,
  };
}
