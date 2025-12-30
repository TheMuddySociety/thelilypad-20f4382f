import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { createPublicClient, http, formatEther, parseEther, Chain, fallback } from "viem";
import { monadMainnet, monadTestnet, getRpcUrls, getMonadChain, NetworkType } from "@/config/alchemy";
import { WalletType, ChainType } from "@/components/wallet/WalletSelectorModal";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | null;
  chainId: number | null;
  network: NetworkType;
  walletType: WalletType | null;
  chainType: ChainType;
}

interface WalletContextType extends WalletState {
  connect: (walletType?: WalletType, chainType?: ChainType) => Promise<void>;
  disconnect: () => void;
  switchToMonad: () => Promise<void>;
  switchNetwork: (network: NetworkType) => void;
  switchChain: (chainType: ChainType) => Promise<void>;
  sendTransaction: (to: string, amount: string) => Promise<string | null>;
  currentChain: Chain;
  getProvider: () => EthereumProvider | null;
  getSolanaProvider: () => SolanaProvider | null;
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

// Helper to get the appropriate EVM provider based on wallet type
const getProviderForWallet = (walletType: WalletType | null): EthereumProvider | null => {
  if (walletType === "phantom") {
    if (window.phantom?.ethereum) {
      return window.phantom.ethereum;
    }
    if (window.ethereum?.isPhantom) {
      return window.ethereum;
    }
    return null;
  }
  
  if (walletType === "metamask") {
    if (window.ethereum?.isMetaMask) {
      return window.ethereum;
    }
    return null;
  }
  
  return window.ethereum || window.phantom?.ethereum || null;
};

// Helper to get Solana provider
const getSolanaProvider = (): SolanaProvider | null => {
  if (window.phantom?.solana) {
    return window.phantom.solana;
  }
  if (window.solana?.isPhantom) {
    return window.solana;
  }
  return null;
};

// Detect which wallets are installed
export const detectInstalledWallets = (): { metamask: boolean; phantom: boolean; phantomSolana: boolean } => {
  const isMetaMaskInstalled = typeof window.ethereum !== "undefined" && !!window.ethereum.isMetaMask;
  const isPhantomInstalled = typeof window.phantom?.ethereum !== "undefined" || 
    (typeof window.ethereum !== "undefined" && !!window.ethereum.isPhantom);
  const isPhantomSolanaInstalled = typeof window.phantom?.solana !== "undefined" ||
    typeof window.solana !== "undefined";
  
  return {
    metamask: isMetaMaskInstalled,
    phantom: isPhantomInstalled,
    phantomSolana: isPhantomSolanaInstalled,
  };
};

// Format Solana balance (lamports to SOL)
const formatSolanaBalance = (lamports: number): string => {
  return (lamports / 1_000_000_000).toFixed(4);
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletState, setWalletState] = useState<WalletState>(() => {
    const savedNetwork = localStorage.getItem("monadNetwork") as NetworkType | null;
    const savedWalletType = localStorage.getItem("walletType") as WalletType | null;
    const savedChainType = localStorage.getItem("chainType") as ChainType | null;
    return {
      address: null,
      isConnected: false,
      isConnecting: false,
      balance: null,
      chainId: null,
      network: savedNetwork || "testnet",
      walletType: savedWalletType,
      chainType: savedChainType || "evm",
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

  const getSolanaProviderCallback = useCallback((): SolanaProvider | null => {
    return getSolanaProvider();
  }, []);

  const fetchEVMBalance = useCallback(async (address: string) => {
    try {
      const balance = await publicClient.getBalance({ address: address as `0x${string}` });
      return formatEther(balance);
    } catch (error) {
      console.error("Error fetching EVM balance:", error);
      return null;
    }
  }, [publicClient]);

  const fetchSolanaBalance = useCallback(async (address: string) => {
    try {
      // Use Solana mainnet or devnet RPC
      const rpcUrl = walletState.network === "mainnet" 
        ? "https://api.mainnet-beta.solana.com"
        : "https://api.devnet.solana.com";
      
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [address],
        }),
      });
      
      const data = await response.json();
      if (data.result?.value !== undefined) {
        return formatSolanaBalance(data.result.value);
      }
      return null;
    } catch (error) {
      console.error("Error fetching Solana balance:", error);
      return null;
    }
  }, [walletState.network]);

  const connectEVM = useCallback(async (walletType: WalletType) => {
    const provider = getProviderForWallet(walletType);
    
    if (!provider) {
      const walletName = walletType === "phantom" ? "Phantom" : "MetaMask";
      alert(`Please install ${walletName} wallet to connect.`);
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true, walletType, chainType: "evm" }));

    try {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      const chainId = await provider.request({
        method: "eth_chainId",
      });

      const address = accounts[0];
      const balance = await fetchEVMBalance(address);

      setWalletState(prev => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
        balance,
        chainId: parseInt(chainId, 16),
        walletType,
        chainType: "evm",
      }));

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", walletType);
      localStorage.setItem("chainType", "evm");
    } catch (error) {
      console.error("Error connecting EVM wallet:", error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [fetchEVMBalance]);

  const connectSolana = useCallback(async () => {
    const provider = getSolanaProvider();
    
    if (!provider) {
      alert("Please install Phantom wallet to connect to Solana.");
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true, walletType: "phantom", chainType: "solana" }));

    try {
      const response = await provider.connect();
      const address = response.publicKey.toString();
      const balance = await fetchSolanaBalance(address);

      setWalletState(prev => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
        balance,
        chainId: null, // Solana doesn't use chain IDs like EVM
        walletType: "phantom",
        chainType: "solana",
      }));

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", "phantom");
      localStorage.setItem("chainType", "solana");
    } catch (error) {
      console.error("Error connecting Solana wallet:", error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [fetchSolanaBalance]);

  const connect = useCallback(async (walletType?: WalletType, chainType?: ChainType) => {
    const targetWalletType = walletType || walletState.walletType || "metamask";
    const targetChainType = chainType || walletState.chainType || "evm";

    if (targetChainType === "solana") {
      await connectSolana();
    } else {
      await connectEVM(targetWalletType);
    }
  }, [walletState.walletType, walletState.chainType, connectEVM, connectSolana]);

  const disconnect = useCallback(async () => {
    // Disconnect Solana if connected
    if (walletState.chainType === "solana") {
      const provider = getSolanaProvider();
      if (provider) {
        try {
          await provider.disconnect();
        } catch (error) {
          console.error("Error disconnecting Solana:", error);
        }
      }
    }

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
    localStorage.removeItem("chainType");
  }, [walletState.chainType]);

  const switchChain = useCallback(async (chainType: ChainType) => {
    if (chainType === walletState.chainType) return;
    
    // Disconnect current wallet and reconnect with new chain
    await disconnect();
    await connect(walletState.walletType || "phantom", chainType);
  }, [walletState.chainType, walletState.walletType, disconnect, connect]);

  const switchNetwork = useCallback(async (network: NetworkType) => {
    setWalletState(prev => ({
      ...prev,
      network,
    }));
    localStorage.setItem("monadNetwork", network);
    
    // If connected to EVM, prompt wallet to switch to the new network
    if (walletState.chainType === "evm") {
      const provider = getProviderForWallet(walletState.walletType);
      if (walletState.isConnected && provider) {
        const targetChain = getMonadChain(network);
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${targetChain.id.toString(16)}` }],
          });
        } catch (switchError: any) {
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
    }
    
    // Refresh Solana balance if on Solana
    if (walletState.chainType === "solana" && walletState.address) {
      const balance = await fetchSolanaBalance(walletState.address);
      setWalletState(prev => ({ ...prev, balance }));
    }
  }, [walletState.isConnected, walletState.walletType, walletState.chainType, walletState.address, fetchSolanaBalance]);

  const switchToMonad = useCallback(async () => {
    if (walletState.chainType !== "evm") {
      // Switch to EVM first
      await switchChain("evm");
      return;
    }

    const provider = getProviderForWallet(walletState.walletType);
    if (!provider) return;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${currentChain.id.toString(16)}` }],
      });
    } catch (switchError: any) {
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
  }, [currentChain, walletState.walletType, walletState.chainType, switchChain]);

  const sendTransaction = useCallback(async (to: string, amount: string): Promise<string | null> => {
    if (walletState.chainType === "solana") {
      // Solana transactions require different handling
      console.warn("Solana transactions not yet implemented");
      return null;
    }

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

      const newBalance = await fetchEVMBalance(walletState.address);
      setWalletState(prev => ({ ...prev, balance: newBalance }));

      return txHash;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  }, [walletState.address, walletState.walletType, walletState.chainType, fetchEVMBalance]);

  // Listen for EVM account changes
  useEffect(() => {
    if (walletState.chainType !== "evm") return;
    
    const provider = getProviderForWallet(walletState.walletType);
    if (!provider) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== walletState.address) {
        const balance = await fetchEVMBalance(accounts[0]);
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
  }, [walletState.address, walletState.walletType, walletState.chainType, disconnect, fetchEVMBalance]);

  // Listen for Solana account changes
  useEffect(() => {
    if (walletState.chainType !== "solana") return;
    
    const provider = getSolanaProvider();
    if (!provider) return;

    const handleAccountChanged = async (publicKey: { toString: () => string } | null) => {
      if (!publicKey) {
        disconnect();
      } else {
        const address = publicKey.toString();
        const balance = await fetchSolanaBalance(address);
        setWalletState(prev => ({
          ...prev,
          address,
          balance,
        }));
      }
    };

    const handleDisconnect = () => {
      disconnect();
    };

    provider.on("accountChanged", handleAccountChanged);
    provider.on("disconnect", handleDisconnect);

    return () => {
      provider.off("accountChanged", handleAccountChanged);
      provider.off("disconnect", handleDisconnect);
    };
  }, [walletState.chainType, disconnect, fetchSolanaBalance]);

  // Auto-connect if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem("walletConnected");
    const savedWalletType = localStorage.getItem("walletType") as WalletType | null;
    const savedChainType = localStorage.getItem("chainType") as ChainType | null;
    
    if (wasConnected === "true" && savedWalletType) {
      if (savedChainType === "solana") {
        const provider = getSolanaProvider();
        if (provider) {
          // Try to reconnect silently
          provider.connect({ onlyIfTrusted: true })
            .then((response) => {
              const address = response.publicKey.toString();
              fetchSolanaBalance(address).then(balance => {
                setWalletState(prev => ({
                  ...prev,
                  address,
                  isConnected: true,
                  balance,
                  walletType: "phantom",
                  chainType: "solana",
                }));
              });
            })
            .catch(() => {
              // Silent reconnect failed, user needs to manually connect
            });
        }
      } else {
        const provider = getProviderForWallet(savedWalletType);
        if (provider) {
          connect(savedWalletType, "evm");
        }
      }
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        ...walletState,
        connect,
        disconnect,
        switchToMonad,
        switchNetwork,
        switchChain,
        sendTransaction,
        currentChain,
        getProvider,
        getSolanaProvider: getSolanaProviderCallback,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
