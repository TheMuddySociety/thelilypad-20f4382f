import { useState, useCallback } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { NFT_CONTRACT_ABI } from "@/config/nftContract";
import { encodeFunctionData } from "viem";
import { toast } from "sonner";

interface AllowlistState {
  isUpdating: boolean;
  txHash: string | null;
  error: string | null;
}

export function useContractAllowlist(contractAddress: string | null) {
  const { address, isConnected, chainType, getProvider } = useWallet();
  const [state, setState] = useState<AllowlistState>({
    isUpdating: false,
    txHash: null,
    error: null,
  });

  const resetState = useCallback(() => {
    setState({
      isUpdating: false,
      txHash: null,
      error: null,
    });
  }, []);

  // Set allowlist for a specific phase on the contract
  const setAllowlist = useCallback(async (
    addresses: string[],
    phaseId: number
  ): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !contractAddress || !provider) {
      setState(prev => ({ ...prev, error: "Wallet or contract not connected" }));
      return null;
    }
    
    if (chainType !== "evm") {
      const errorMsg = "Please switch to an EVM wallet for contract operations. Open the wallet menu and click 'Switch to EVM'.";
      setState(prev => ({ ...prev, error: errorMsg }));
      toast.error("EVM Wallet Required", { description: errorMsg });
      return null;
    }

    if (addresses.length === 0) {
      setState(prev => ({ ...prev, error: "No addresses to add" }));
      return null;
    }

    setState({
      isUpdating: true,
      txHash: null,
      error: null,
    });

    try {
      // Encode the setAllowlist function call
      // Args order: (phaseId, addresses) - matches LilyPadNFT.sol
      const data = encodeFunctionData({
        abi: NFT_CONTRACT_ABI,
        functionName: "setAllowlist",
        args: [BigInt(phaseId), addresses as `0x${string}`[]],
      });

      // Send transaction
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
        }],
      });

      setState({
        isUpdating: false,
        txHash,
        error: null,
      });

      return txHash;

    } catch (error: any) {
      console.error("Allowlist update error:", error);
      
      let errorMessage = "Failed to update allowlist";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState({
        isUpdating: false,
        txHash: null,
        error: errorMessage,
      });

      return null;
    }
  }, [address, isConnected, contractAddress]);

  // Configure a mint phase on the contract
  const configurePhase = useCallback(async (
    phaseId: number,
    priceInMon: string,
    maxPerWallet: number,
    supply: number,
    requiresAllowlist: boolean
  ): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !contractAddress || !provider) {
      setState(prev => ({ ...prev, error: "Wallet or contract not connected" }));
      return null;
    }
    
    if (chainType !== "evm") {
      const errorMsg = "Please switch to an EVM wallet for contract operations. Open the wallet menu and click 'Switch to EVM'.";
      setState(prev => ({ ...prev, error: errorMsg }));
      toast.error("EVM Wallet Required", { description: errorMsg });
      return null;
    }

    setState({
      isUpdating: true,
      txHash: null,
      error: null,
    });

    try {
      // Convert price from MON to wei (1 MON = 10^18 wei)
      const priceInWei = BigInt(Math.floor(parseFloat(priceInMon) * 1e18));

      // Encode the configurePhase function call
      const data = encodeFunctionData({
        abi: NFT_CONTRACT_ABI,
        functionName: "configurePhase",
        args: [
          BigInt(phaseId),
          priceInWei,
          BigInt(maxPerWallet),
          BigInt(supply),
          requiresAllowlist,
        ],
      });

      // Send transaction
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
        }],
      });

      setState({
        isUpdating: false,
        txHash,
        error: null,
      });

      return txHash;

    } catch (error: any) {
      console.error("Phase config error:", error);
      
      let errorMessage = "Failed to configure phase";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState({
        isUpdating: false,
        txHash: null,
        error: errorMessage,
      });

      return null;
    }
  }, [address, isConnected, contractAddress]);

  // Set active phase on the contract
  const setActivePhase = useCallback(async (phaseId: number): Promise<string | null> => {
    const provider = getProvider();
    if (!isConnected || !address || !contractAddress || !provider) {
      setState(prev => ({ ...prev, error: "Wallet or contract not connected" }));
      return null;
    }
    
    if (chainType !== "evm") {
      const errorMsg = "Please switch to an EVM wallet for contract operations. Open the wallet menu and click 'Switch to EVM'.";
      setState(prev => ({ ...prev, error: errorMsg }));
      toast.error("EVM Wallet Required", { description: errorMsg });
      return null;
    }

    setState({
      isUpdating: true,
      txHash: null,
      error: null,
    });

    try {
      const data = encodeFunctionData({
        abi: NFT_CONTRACT_ABI,
        functionName: "setActivePhase",
        args: [BigInt(phaseId)],
      });

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: contractAddress,
          data,
        }],
      });

      setState({
        isUpdating: false,
        txHash,
        error: null,
      });

      return txHash;

    } catch (error: any) {
      console.error("Set active phase error:", error);
      
      let errorMessage = "Failed to set active phase";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState({
        isUpdating: false,
        txHash: null,
        error: errorMessage,
      });

      return null;
    }
  }, [address, isConnected, contractAddress]);

  return {
    ...state,
    setAllowlist,
    configurePhase,
    setActivePhase,
    resetState,
  };
}
