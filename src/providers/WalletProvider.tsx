import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPublicClient, http, formatEther, parseEther } from "viem";
import { monadMainnet, getAlchemyRpcUrl } from "@/config/alchemy";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | null;
  chainId: number | null;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToMonad: () => Promise<void>;
  sendTransaction: (to: string, amount: string) => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    balance: null,
    chainId: null,
  });

  const publicClient = createPublicClient({
    chain: monadMainnet,
    transport: http(getAlchemyRpcUrl()),
  });

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const balance = await publicClient.getBalance({ address: address as `0x${string}` });
      return formatEther(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      return null;
    }
  }, [publicClient]);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask or another Web3 wallet to connect.");
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true }));

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      const address = accounts[0];
      const balance = await fetchBalance(address);

      setWalletState({
        address,
        isConnected: true,
        isConnecting: false,
        balance,
        chainId: parseInt(chainId, 16),
      });

      // Store connection state
      localStorage.setItem("walletConnected", "true");
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [fetchBalance]);

  const disconnect = useCallback(() => {
    setWalletState({
      address: null,
      isConnected: false,
      isConnecting: false,
      balance: null,
      chainId: null,
    });
    localStorage.removeItem("walletConnected");
  }, []);

  const switchToMonad = useCallback(async () => {
    if (typeof window.ethereum === "undefined") return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${monadMainnet.id.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Chain not added, try to add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${monadMainnet.id.toString(16)}`,
                chainName: monadMainnet.name,
                nativeCurrency: monadMainnet.nativeCurrency,
                rpcUrls: [monadMainnet.rpcUrls.default.http[0]],
                blockExplorerUrls: [monadMainnet.blockExplorers.default.url],
              },
            ],
          });
        } catch (addError) {
          console.error("Error adding Monad chain:", addError);
        }
      }
    }
  }, []);

  const sendTransaction = useCallback(async (to: string, amount: string): Promise<string | null> => {
    if (typeof window.ethereum === "undefined" || !walletState.address) {
      return null;
    }

    try {
      const valueInWei = parseEther(amount);
      
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletState.address,
            to: to,
            value: `0x${valueInWei.toString(16)}`,
          },
        ],
      });

      // Refresh balance after transaction
      const newBalance = await fetchBalance(walletState.address);
      setWalletState(prev => ({ ...prev, balance: newBalance }));

      return txHash;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  }, [walletState.address, fetchBalance]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum === "undefined") return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== walletState.address) {
        const balance = await fetchBalance(accounts[0]);
        setWalletState(prev => ({
          ...prev,
          address: accounts[0],
          balance,
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      setWalletState(prev => ({
        ...prev,
        chainId: parseInt(chainId, 16),
      }));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [walletState.address, disconnect, fetchBalance]);

  // Auto-connect if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem("walletConnected");
    if (wasConnected === "true" && typeof window.ethereum !== "undefined") {
      connect();
    }
  }, [connect]);

  return (
    <WalletContext.Provider
      value={{
        ...walletState,
        connect,
        disconnect,
        switchToMonad,
        sendTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
