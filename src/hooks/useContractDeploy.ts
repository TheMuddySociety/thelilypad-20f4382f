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
        error: "TheLilyPadLaunchpad contract not yet available on Monad Testnet. Please check back soon." 
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
      console.log("[Deploy] Starting interaction with TheLilyPadLaunchpad...", params);
      console.log("[Deploy] Contract address:", NFT_FACTORY_ADDRESS);
      console.log("[Deploy] User address:", address);
      
      // Since TheLilyPadLaunchpad is already a deployed NFT contract (not a factory),
      // we return the contract address directly. The user interacts with THIS contract.
      // No new contract deployment is needed - this IS the launchpad contract.
      
      setState(prev => ({ ...prev, deploymentStep: "confirming" }));
      console.log("[Deploy] TheLilyPadLaunchpad is already deployed. Using existing contract.");

      // The contract address is the launchpad itself
      const contractAddress = NFT_FACTORY_ADDRESS;
      
      setState({
        isDeploying: false,
        deploymentStep: "success",
        txHash: null,
        contractAddress,
        error: null,
        isVerified: true,
      });

      toast.success("Connected to TheLilyPadLaunchpad!", {
        description: `Contract: ${contractAddress.slice(0, 10)}...${contractAddress.slice(-8)}`
      });

      return contractAddress;

    } catch (error: any) {
      console.error("Deployment error:", error);
      
      let errorMessage = "Connection failed";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.code === -32000) {
        errorMessage = "Insufficient funds for gas";
      } else if (error.code === -32603) {
        errorMessage = "Internal error - the contract may not be available";
      } else if (error.message?.includes("gas")) {
        errorMessage = "Gas estimation failed - ensure you have enough testnet MON";
      } else if (error.message?.includes("nonce")) {
        errorMessage = "Nonce error - please try again";
      } else if (error.message?.includes("execution reverted")) {
        errorMessage = "Contract rejected the request - check parameters";
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
  }, [address, isConnected, chainType, getProvider]);

  return {
    ...state,
    deployContract,
    resetState,
    isFactoryAvailable: isFactoryConfigured(),
    platformName: LILYPAD_PLATFORM_NAME,
    platformVersion: LILYPAD_PLATFORM_VERSION,
  };
}
