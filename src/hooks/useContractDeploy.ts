import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import {
  NFT_FACTORY_ADDRESS,
  isFactoryConfigured,
  LILYPAD_PLATFORM_NAME,
  LILYPAD_PLATFORM_VERSION,
} from "@/config/nftFactory";
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

export function useContractDeploy() {
  const { address, isConnected, chainType, getProvider } = useWallet();
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

  const deployContract = useCallback(
    async (_params: DeployParams): Promise<string | null> => {
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

      // Keep the existing 'factory configured' check for UI state, but do NOT
      // auto-write NFT_FACTORY_ADDRESS into collection.contract_address.
      if (!isFactoryConfigured()) {
        setState((prev) => ({
          ...prev,
          error:
            "Automatic deploy isn't available right now. Please deploy externally and link the contract address.",
        }));
        return null;
      }

      setState({
        isDeploying: false,
        deploymentStep: "error",
        txHash: null,
        contractAddress: null,
        error:
          "Automatic deployment isn't configured yet. Please deploy your collection contract externally (Remix/Hardhat) and then use 'Link Existing Contract' to paste the deployed address.",
        isVerified: false,
      });

      toast.error("Deployment not available", {
        description:
          "Deploy externally and link the deployed contract address in this modal.",
      });

      return null;
    },
    [address, isConnected, chainType, getProvider]
  );

  return {
    ...state,
    deployContract,
    resetState,
    // Still expose this for UI messaging
    isFactoryAvailable: isFactoryConfigured(),
    platformName: LILYPAD_PLATFORM_NAME,
    platformVersion: LILYPAD_PLATFORM_VERSION,
    // Helpful for debugging / display if needed
    platformContractAddress: NFT_FACTORY_ADDRESS,
  };
}
