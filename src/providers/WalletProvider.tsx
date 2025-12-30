import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createPublicClient, http, formatEther, parseEther, Chain, fallback } from "viem";
import { monadMainnet, monadTestnet, getRpcUrls, getMonadChain, NetworkType } from "@/config/alchemy";
import { WalletType, ChainType } from "@/components/wallet/WalletSelectorModal";
import { getPhantomSDK, waitForPhantomExtension, AddressType } from "@/config/phantom";
import type { BrowserSDK, ConnectResult, InjectedWalletInfo } from "@phantom/browser-sdk";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | null;
  chainId: number | null;
  network: NetworkType;
  walletType: WalletType | null;
  chainType: ChainType;
  authProvider?: string; // Track if connected via OAuth (google, apple) or injected
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
  getPhantomSDK: () => BrowserSDK;
  discoveredWallets: InjectedWalletInfo[];
  isPhantomAvailable: boolean;
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

// Legacy: Helper to get the appropriate EVM provider based on wallet type (fallback)
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

// Legacy: Helper to get Solana provider (fallback)
const getLegacySolanaProvider = (): SolanaProvider | null => {
  if (window.phantom?.solana) {
    return window.phantom.solana;
  }
  if (window.solana?.isPhantom) {
    return window.solana;
  }
  return null;
};

// Detect which wallets are installed (using SDK when available)
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

  const [discoveredWallets, setDiscoveredWallets] = useState<InjectedWalletInfo[]>([]);
  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false);
  
  // Get SDK instance
  const sdkRef = useRef<BrowserSDK | null>(null);
  const getSDK = useCallback(() => {
    if (!sdkRef.current) {
      sdkRef.current = getPhantomSDK();
    }
    return sdkRef.current;
  }, []);

  const currentChain = useMemo(() => getMonadChain(walletState.network), [walletState.network]);

  const publicClient = useMemo(() => {
    const rpcUrls = getRpcUrls(walletState.network);
    return createPublicClient({
      chain: currentChain,
      transport: fallback(rpcUrls.map(url => http(url)), { rank: true }),
    });
  }, [walletState.network, currentChain]);

  // Get EVM provider - prefer SDK when using Phantom
  const getProvider = useCallback((): EthereumProvider | null => {
    // If using Phantom SDK, use SDK's ethereum interface
    if (walletState.walletType === "phantom" && walletState.authProvider) {
      const sdk = getSDK();
      // SDK provides EIP-1193 compatible interface
      return sdk.ethereum as unknown as EthereumProvider;
    }
    // Fallback to legacy provider detection
    return getProviderForWallet(walletState.walletType);
  }, [walletState.walletType, walletState.authProvider, getSDK]);

  // Get Solana provider - prefer SDK when using Phantom
  const getSolanaProviderCallback = useCallback((): SolanaProvider | null => {
    // If using Phantom SDK, use SDK's solana interface
    if (walletState.walletType === "phantom" && walletState.authProvider) {
      const sdk = getSDK();
      // SDK provides Solana interface
      return sdk.solana as unknown as SolanaProvider;
    }
    // Fallback to legacy provider detection
    return getLegacySolanaProvider();
  }, [walletState.walletType, walletState.authProvider, getSDK]);

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

  // Connect using Phantom Browser SDK
  const connectWithSDK = useCallback(async (chainType: ChainType) => {
    const sdk = getSDK();
    
    setWalletState(prev => ({ ...prev, isConnecting: true, walletType: "phantom", chainType }));

    try {
      // Connect with injected provider (browser extension)
      const result: ConnectResult = await sdk.connect({ provider: "injected" });
      
      // Find the appropriate address based on chain type
      let address: string | null = null;
      
      for (const addr of result.addresses) {
        if (chainType === "solana" && addr.addressType === AddressType.solana) {
          address = addr.address;
          break;
        } else if (chainType === "evm" && addr.addressType === AddressType.ethereum) {
          address = addr.address;
          break;
        }
      }

      if (!address) {
        throw new Error(`No ${chainType} address found`);
      }

      // Fetch balance based on chain type
      let balance: string | null = null;
      let chainId: number | null = null;

      if (chainType === "evm") {
        balance = await fetchEVMBalance(address);
        try {
          chainId = await sdk.ethereum.getChainId();
        } catch {
          chainId = null;
        }
      } else {
        balance = await fetchSolanaBalance(address);
      }

      setWalletState(prev => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
        balance,
        chainId,
        walletType: "phantom",
        chainType,
        authProvider: result.authProvider || "injected",
      }));

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", "phantom");
      localStorage.setItem("chainType", chainType);
      localStorage.setItem("authProvider", result.authProvider || "injected");
    } catch (error) {
      console.error("Error connecting with SDK:", error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  }, [getSDK, fetchEVMBalance, fetchSolanaBalance]);

  // Legacy EVM connect (for MetaMask and fallback)
  const connectEVM = useCallback(async (walletType: WalletType) => {
    // For Phantom, try SDK first
    if (walletType === "phantom" && isPhantomAvailable) {
      try {
        await connectWithSDK("evm");
        return;
      } catch (error) {
        console.warn("SDK connect failed, falling back to legacy:", error);
      }
    }

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
        authProvider: "injected",
      }));

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", walletType);
      localStorage.setItem("chainType", "evm");
      localStorage.setItem("authProvider", "injected");
    } catch (error) {
      console.error("Error connecting EVM wallet:", error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [fetchEVMBalance, isPhantomAvailable, connectWithSDK]);

  // Legacy Solana connect (fallback)
  const connectSolana = useCallback(async () => {
    // Try SDK first if Phantom is available
    if (isPhantomAvailable) {
      try {
        await connectWithSDK("solana");
        return;
      } catch (error) {
        console.warn("SDK connect failed, falling back to legacy:", error);
      }
    }

    const provider = getLegacySolanaProvider();
    
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
        chainId: null,
        walletType: "phantom",
        chainType: "solana",
        authProvider: "injected",
      }));

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", "phantom");
      localStorage.setItem("chainType", "solana");
      localStorage.setItem("authProvider", "injected");
    } catch (error) {
      console.error("Error connecting Solana wallet:", error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [fetchSolanaBalance, isPhantomAvailable, connectWithSDK]);

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
    const sdk = getSDK();
    
    // Try SDK disconnect first
    try {
      if (sdk.isConnected()) {
        await sdk.disconnect();
      }
    } catch (error) {
      console.error("SDK disconnect error:", error);
    }

    // Also disconnect legacy Solana if needed
    if (walletState.chainType === "solana") {
      const provider = getLegacySolanaProvider();
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
      authProvider: undefined,
    }));
    localStorage.removeItem("walletConnected");
    localStorage.removeItem("walletType");
    localStorage.removeItem("chainType");
    localStorage.removeItem("authProvider");
  }, [walletState.chainType, getSDK]);

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
      const sdk = getSDK();
      const targetChain = getMonadChain(network);
      
      // Try SDK first if using Phantom
      if (walletState.walletType === "phantom" && sdk.isConnected()) {
        try {
          await sdk.ethereum.switchChain(targetChain.id);
          return;
        } catch (error) {
          console.warn("SDK switchChain failed, trying legacy:", error);
        }
      }
      
      // Fallback to legacy provider
      const provider = getProviderForWallet(walletState.walletType);
      if (walletState.isConnected && provider) {
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
  }, [walletState.isConnected, walletState.walletType, walletState.chainType, walletState.address, fetchSolanaBalance, getSDK]);

  const switchToMonad = useCallback(async () => {
    if (walletState.chainType !== "evm") {
      await switchChain("evm");
      return;
    }

    const sdk = getSDK();
    
    // Try SDK first if using Phantom
    if (walletState.walletType === "phantom" && sdk.isConnected()) {
      try {
        await sdk.ethereum.switchChain(currentChain.id);
        return;
      } catch (error) {
        console.warn("SDK switchChain failed, trying legacy:", error);
      }
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
  }, [currentChain, walletState.walletType, walletState.chainType, switchChain, getSDK]);

  const sendTransaction = useCallback(async (to: string, amount: string): Promise<string | null> => {
    if (walletState.chainType === "solana") {
      console.warn("Solana transactions not yet implemented");
      return null;
    }

    const sdk = getSDK();
    
    // Try SDK first if using Phantom
    if (walletState.walletType === "phantom" && sdk.isConnected()) {
      try {
        const valueInWei = parseEther(amount);
        const result = await sdk.ethereum.sendTransaction({
          to,
          value: `0x${valueInWei.toString(16)}`,
          gas: "21000",
        });
        
        if (walletState.address) {
          const newBalance = await fetchEVMBalance(walletState.address);
          setWalletState(prev => ({ ...prev, balance: newBalance }));
        }
        
        // sendTransaction returns the tx hash directly as a string
        return result;
      } catch (error) {
        console.error("SDK sendTransaction failed:", error);
        throw error;
      }
    }

    // Fallback to legacy provider
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
  }, [walletState.address, walletState.walletType, walletState.chainType, fetchEVMBalance, getSDK]);

  // Initialize SDK and check Phantom availability
  useEffect(() => {
    const initSDK = async () => {
      const isAvailable = await waitForPhantomExtension(3000);
      setIsPhantomAvailable(isAvailable);
      
      if (isAvailable) {
        const sdk = getSDK();
        // Discover available wallets
        await sdk.discoverWallets();
        setDiscoveredWallets(sdk.getDiscoveredWallets());
      }
    };
    
    initSDK();
  }, [getSDK]);

  // Set up SDK event listeners
  useEffect(() => {
    const sdk = getSDK();
    
    const handleConnect = (data: any) => {
      console.log("SDK connect event:", data);
    };
    
    const handleDisconnect = () => {
      console.log("SDK disconnect event");
      disconnect();
    };
    
    const handleConnectError = (data: any) => {
      console.error("SDK connect error:", data);
    };
    
    sdk.on("connect", handleConnect);
    sdk.on("disconnect", handleDisconnect);
    sdk.on("connect_error", handleConnectError);
    
    return () => {
      sdk.off("connect", handleConnect);
      sdk.off("disconnect", handleDisconnect);
      sdk.off("connect_error", handleConnectError);
    };
  }, [getSDK, disconnect]);

  // Listen for EVM account changes (legacy provider)
  useEffect(() => {
    if (walletState.chainType !== "evm") return;
    // Skip if using SDK-connected wallet (SDK handles events)
    if (walletState.authProvider && walletState.walletType === "phantom") return;
    
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
  }, [walletState.address, walletState.walletType, walletState.chainType, walletState.authProvider, disconnect, fetchEVMBalance]);

  // Listen for Solana account changes (legacy provider)
  useEffect(() => {
    if (walletState.chainType !== "solana") return;
    // Skip if using SDK-connected wallet (SDK handles events)
    if (walletState.authProvider && walletState.walletType === "phantom") return;
    
    const provider = getLegacySolanaProvider();
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
  }, [walletState.chainType, walletState.authProvider, walletState.walletType, disconnect, fetchSolanaBalance]);

  // Auto-connect if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem("walletConnected");
    const savedWalletType = localStorage.getItem("walletType") as WalletType | null;
    const savedChainType = localStorage.getItem("chainType") as ChainType | null;
    const savedAuthProvider = localStorage.getItem("authProvider");
    
    if (wasConnected === "true" && savedWalletType) {
      // Try SDK auto-connect first for Phantom
      if (savedWalletType === "phantom" && savedAuthProvider) {
        const sdk = getSDK();
        sdk.autoConnect()
          .then(() => {
            if (sdk.isConnected()) {
              const addresses = sdk.getAddresses();
              let address: string | null = null;
              
              for (const addr of addresses) {
                if (savedChainType === "solana" && addr.addressType === AddressType.solana) {
                  address = addr.address;
                  break;
                } else if (savedChainType === "evm" && addr.addressType === AddressType.ethereum) {
                  address = addr.address;
                  break;
                }
              }
              
              if (address) {
                const fetchBalance = savedChainType === "solana" ? fetchSolanaBalance : fetchEVMBalance;
                fetchBalance(address).then(balance => {
                  setWalletState(prev => ({
                    ...prev,
                    address,
                    isConnected: true,
                    balance,
                    walletType: "phantom",
                    chainType: savedChainType || "evm",
                    authProvider: savedAuthProvider,
                  }));
                });
              }
            }
          })
          .catch(() => {
            // SDK auto-connect failed, try legacy
            tryLegacyAutoConnect();
          });
      } else {
        tryLegacyAutoConnect();
      }
    }
    
    function tryLegacyAutoConnect() {
      if (savedChainType === "solana") {
        const provider = getLegacySolanaProvider();
        if (provider) {
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
                  authProvider: "injected",
                }));
              });
            })
            .catch(() => {
              // Silent reconnect failed
            });
        }
      } else {
        const provider = getProviderForWallet(savedWalletType);
        if (provider && savedWalletType) {
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
        getPhantomSDK: getSDK,
        discoveredWallets,
        isPhantomAvailable,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
