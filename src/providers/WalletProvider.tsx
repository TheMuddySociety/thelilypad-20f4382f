import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { createPublicClient, http, formatEther, parseEther, Chain, fallback } from "viem";
import { monadMainnet, monadTestnet, getRpcUrls, getMonadChain, NetworkType } from "@/config/alchemy";
import { WalletType } from "@/components/wallet/WalletSelectorModal";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | null;
  chainId: number | null;
  network: NetworkType;
  walletType: WalletType | null;
}

interface WalletContextType extends WalletState {
  connect: (walletType?: WalletType) => Promise<void>;
  disconnect: () => void;
  switchToMonad: () => Promise<void>;
  switchNetwork: (network: NetworkType) => void;
  sendTransaction: (to: string, amount: string) => Promise<string | null>;
  currentChain: Chain;
  getProvider: () => EthereumProvider | null;
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

// Helper to get the appropriate provider based on wallet type
const getProviderForWallet = (walletType: WalletType | null): EthereumProvider | null => {
  if (walletType === "phantom") {
    // Phantom injects into window.phantom.ethereum for EVM chains
    if (window.phantom?.ethereum) {
      return window.phantom.ethereum;
    }
    // Fallback: Phantom may also inject directly into window.ethereum with isPhantom flag
    if (window.ethereum?.isPhantom) {
      return window.ethereum;
    }
    return null;
  }
  
  if (walletType === "metamask") {
    // MetaMask injects into window.ethereum
    if (window.ethereum?.isMetaMask) {
      return window.ethereum;
    }
    return null;
  }
  
  // Default: try to get any available provider
  return window.ethereum || window.phantom?.ethereum || null;
};

// Detect which wallets are installed
export const detectInstalledWallets = (): { metamask: boolean; phantom: boolean } => {
  const isMetaMaskInstalled = typeof window.ethereum !== "undefined" && !!window.ethereum.isMetaMask;
  const isPhantomInstalled = typeof window.phantom?.ethereum !== "undefined" || 
    (typeof window.ethereum !== "undefined" && !!window.ethereum.isPhantom);
  
  return {
    metamask: isMetaMaskInstalled,
    phantom: isPhantomInstalled,
  };
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletState, setWalletState] = useState<WalletState>(() => {
    const savedNetwork = localStorage.getItem("monadNetwork") as NetworkType | null;
    const savedWalletType = localStorage.getItem("walletType") as WalletType | null;
    return {
      address: null,
      isConnected: false,
      isConnecting: false,
      balance: null,
      chainId: null,
      network: savedNetwork || "testnet",
      walletType: savedWalletType,
    };
  });

  const currentChain = useMemo(() => getMonadChain(walletState.network), [walletState.network]);

  const publicClient = useMemo(() => {
    const rpcUrls = getRpcUrls(walletState.network);
    return createPublicClient({
      chain: currentChain,
      transport: fallback(rpcUrls.map(url => http(url)), { rank: true }),
    });
  }, [walletState.network, currentChain]);

  const getProvider = useCallback((): EthereumProvider | null => {
    return getProviderForWallet(walletState.walletType);
  }, [walletState.walletType]);

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const balance = await publicClient.getBalance({ address: address as `0x${string}` });
      return formatEther(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      return null;
    }
  }, [publicClient]);

  const connect = useCallback(async (walletType?: WalletType) => {
    const targetWalletType = walletType || walletState.walletType || "metamask";
    const provider = getProviderForWallet(targetWalletType);
    
    if (!provider) {
      const walletName = targetWalletType === "phantom" ? "Phantom" : "MetaMask";
      alert(`Please install ${walletName} wallet to connect.`);
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true, walletType: targetWalletType }));

    try {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      const chainId = await provider.request({
        method: "eth_chainId",
      });

      const address = accounts[0];
      const balance = await fetchBalance(address);

      setWalletState(prev => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
        balance,
        chainId: parseInt(chainId, 16),
        walletType: targetWalletType,
      }));

      // Store connection state
      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", targetWalletType);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [fetchBalance, walletState.walletType]);

  const disconnect = useCallback(() => {
    setWalletState(prev => ({
      ...prev,
      address: null,
      isConnected: false,
      isConnecting: false,
      balance: null,
      chainId: null,
      walletType: null,
    }));
    localStorage.removeItem("walletConnected");
    localStorage.removeItem("walletType");
  }, []);

  const switchNetwork = useCallback(async (network: NetworkType) => {
    setWalletState(prev => ({
      ...prev,
      network,
    }));
    localStorage.setItem("monadNetwork", network);
    
    // If connected, prompt wallet to switch to the new network
    const provider = getProviderForWallet(walletState.walletType);
    if (walletState.isConnected && provider) {
      const targetChain = getMonadChain(network);
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${targetChain.id.toString(16)}` }],
        });
      } catch (switchError: any) {
        // Chain not added, try to add it
        if (switchError.code === 4902) {
          try {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${targetChain.id.toString(16)}`,
                  chainName: targetChain.name,
                  nativeCurrency: targetChain.nativeCurrency,
                  rpcUrls: [targetChain.rpcUrls.default.http[0]],
                  blockExplorerUrls: [targetChain.blockExplorers.default.url],
                },
              ],
            });
          } catch (addError) {
            console.error("Error adding chain:", addError);
          }
        }
      }
    }
  }, [walletState.isConnected, walletState.walletType]);

  const switchToMonad = useCallback(async () => {
    const provider = getProviderForWallet(walletState.walletType);
    if (!provider) return;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${currentChain.id.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Chain not added, try to add it
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${currentChain.id.toString(16)}`,
                chainName: currentChain.name,
                nativeCurrency: currentChain.nativeCurrency,
                rpcUrls: [currentChain.rpcUrls.default.http[0]],
                blockExplorerUrls: [currentChain.blockExplorers.default.url],
              },
            ],
          });
        } catch (addError) {
          console.error("Error adding Monad chain:", addError);
        }
      }
    }
  }, [currentChain, walletState.walletType]);

  const sendTransaction = useCallback(async (to: string, amount: string): Promise<string | null> => {
    const provider = getProviderForWallet(walletState.walletType);
    if (!provider || !walletState.address) {
      return null;
    }

    try {
      const valueInWei = parseEther(amount);
      
      const txHash = await provider.request({
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
  }, [walletState.address, walletState.walletType, fetchBalance]);

  // Listen for account changes
  useEffect(() => {
    const provider = getProviderForWallet(walletState.walletType);
    if (!provider) return;

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

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
    };
  }, [walletState.address, walletState.walletType, disconnect, fetchBalance]);

  // Auto-connect if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem("walletConnected");
    const savedWalletType = localStorage.getItem("walletType") as WalletType | null;
    if (wasConnected === "true" && savedWalletType) {
      const provider = getProviderForWallet(savedWalletType);
      if (provider) {
        connect(savedWalletType);
      }
    }
  }, [connect]);

  return (
    <WalletContext.Provider
      value={{
        ...walletState,
        connect,
        disconnect,
        switchToMonad,
        switchNetwork,
        sendTransaction,
        currentChain,
        getProvider,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
