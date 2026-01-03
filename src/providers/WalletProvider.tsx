import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createPublicClient, http, formatEther, parseEther, Chain, fallback } from "viem";
import { monadMainnet, monadTestnet, getRpcUrls, getMonadChain, NetworkType } from "@/config/alchemy";
import { getPhantomSDK, waitForPhantomExtension, AddressType, resetPhantomSDK } from "@/config/phantom";
import type { BrowserSDK, ConnectResult, InjectedWalletInfo, AuthProviderType } from "@phantom/browser-sdk";
import { toast } from "sonner";

// Types
export type WalletType = "metamask" | "phantom";
export type ChainType = "evm" | "solana";
export type OAuthProvider = "google" | "apple";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | null;
  chainId: number | null;
  network: NetworkType;
  walletType: WalletType | null;
  chainType: ChainType;
  authProvider?: string;
}

interface WalletContextType extends WalletState {
  connect: (walletType?: WalletType, chainType?: ChainType) => Promise<void>;
  connectWithOAuth: (provider: OAuthProvider, chainType: ChainType) => Promise<void>;
  disconnect: () => void;
  switchNetwork: (network: NetworkType) => Promise<void>;
  switchChain: (chainType: ChainType) => Promise<void>;
  switchToMonad: () => Promise<void>;
  sendTransaction: (to: string, amount: string) => Promise<string | null>;
  getProvider: () => any;
  getSolanaProvider: () => any;
  currentChain: Chain;
  isPhantomAvailable: boolean;
  discoveredWallets: InjectedWalletInfo[];
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

// Get EVM provider
const getEVMProvider = (walletType: WalletType | null) => {
  if (walletType === "phantom") {
    return window.phantom?.ethereum || (window.ethereum?.isPhantom ? window.ethereum : null);
  }
  if (walletType === "metamask") {
    return window.ethereum?.isMetaMask ? window.ethereum : null;
  }
  return window.ethereum || window.phantom?.ethereum || null;
};

// Get Solana provider
const getSolanaProvider = () => {
  return window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
};

// Format Solana balance
const formatSolanaBalance = (lamports: number): string => {
  return (lamports / 1_000_000_000).toFixed(4);
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>(() => ({
    address: null,
    isConnected: false,
    isConnecting: false,
    balance: null,
    chainId: null,
    network: (localStorage.getItem("monadNetwork") as NetworkType) || "testnet",
    walletType: localStorage.getItem("walletType") as WalletType | null,
    chainType: (localStorage.getItem("chainType") as ChainType) || "evm",
  }));

  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false);
  const [discoveredWallets, setDiscoveredWallets] = useState<InjectedWalletInfo[]>([]);
  const sdkRef = useRef<BrowserSDK | null>(null);
  const stateRef = useRef(state);
  
  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const getSDK = useCallback(() => {
    if (!sdkRef.current) {
      sdkRef.current = getPhantomSDK();
    }
    return sdkRef.current;
  }, []);

  const currentChain = useMemo(() => getMonadChain(state.network), [state.network]);

  const publicClient = useMemo(() => {
    const rpcUrls = getRpcUrls(state.network);
    return createPublicClient({
      chain: currentChain,
      transport: fallback(rpcUrls.map(url => http(url)), { rank: true }),
    });
  }, [state.network, currentChain]);

  // Fetch EVM balance
  const fetchEVMBalance = useCallback(async (address: string) => {
    try {
      const balance = await publicClient.getBalance({ address: address as `0x${string}` });
      return formatEther(balance);
    } catch (error) {
      console.error("Error fetching EVM balance:", error);
      return null;
    }
  }, [publicClient]);

  // Fetch Solana balance
  const fetchSolanaBalance = useCallback(async (address: string) => {
    try {
      const rpcUrl = state.network === "mainnet" 
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
      return data.result?.value !== undefined ? formatSolanaBalance(data.result.value) : null;
    } catch (error) {
      console.error("Error fetching Solana balance:", error);
      return null;
    }
  }, [state.network]);

  // Connect with SDK (Phantom - supports both EVM and Solana)
  const connectWithSDK = useCallback(async (chainType: ChainType, provider?: AuthProviderType) => {
    const sdk = getSDK();
    setState(prev => ({ ...prev, isConnecting: true, walletType: "phantom", chainType }));

    try {
      const result: ConnectResult = await sdk.connect({ provider: provider || "injected" });
      
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

      if (!address) throw new Error(`No ${chainType} address found`);

      const balance = chainType === "evm" 
        ? await fetchEVMBalance(address) 
        : await fetchSolanaBalance(address);

      let chainId: number | null = null;
      if (chainType === "evm") {
        try { 
          chainId = await sdk.ethereum.getChainId(); 
        } catch (e) {
          // Fallback to provider request
          try {
            const provider = getEVMProvider("phantom");
            if (provider) {
              const chainIdHex = await provider.request({ method: "eth_chainId" });
              chainId = parseInt(chainIdHex, 16);
            }
          } catch {}
        }
        console.log("Connected on chain ID:", chainId);
      }

      // Auto-detect and sync network based on wallet's current chain (for EVM)
      let detectedNetwork: NetworkType = state.network;
      if (chainType === "evm" && chainId) {
        if (chainId === 143) {
          detectedNetwork = "mainnet";
          localStorage.setItem("monadNetwork", "mainnet");
          console.log("Auto-detected Monad Mainnet from wallet");
        } else if (chainId === 10143) {
          detectedNetwork = "testnet";
          localStorage.setItem("monadNetwork", "testnet");
          console.log("Auto-detected Monad Testnet from wallet");
        }
      }

      setState(prev => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
        balance,
        chainId,
        network: detectedNetwork,
        walletType: "phantom",
        chainType,
        authProvider: result.authProvider || (provider as string) || "injected",
      }));

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", "phantom");
      localStorage.setItem("chainType", chainType);
      localStorage.setItem("authProvider", result.authProvider || (provider as string) || "injected");
      
      const networkLabel = detectedNetwork === "mainnet" ? "Mainnet" : "Testnet";
      toast.success(`Wallet connected on ${networkLabel}`);
    } catch (error: any) {
      console.error("SDK connect error:", error);
      setState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  }, [getSDK, fetchEVMBalance, fetchSolanaBalance, state.network]);

  // Connect EVM (MetaMask or fallback)
  const connectEVM = useCallback(async (walletType: WalletType) => {
    if (walletType === "phantom" && isPhantomAvailable) {
      try {
        await connectWithSDK("evm");
        return;
      } catch (error) {
        console.warn("SDK connect failed, trying legacy:", error);
      }
    }

    const provider = getEVMProvider(walletType);
    if (!provider) {
      toast.error(`Please install ${walletType === "phantom" ? "Phantom" : "MetaMask"}`);
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, walletType, chainType: "evm" }));

    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      const address = accounts[0];
      const parsedChainId = parseInt(chainIdHex, 16);
      
      // Auto-detect and sync network based on wallet's current chain
      let detectedNetwork: NetworkType = state.network;
      if (parsedChainId === 143) {
        detectedNetwork = "mainnet";
        localStorage.setItem("monadNetwork", "mainnet");
        console.log("Auto-detected Monad Mainnet from wallet");
      } else if (parsedChainId === 10143) {
        detectedNetwork = "testnet";
        localStorage.setItem("monadNetwork", "testnet");
        console.log("Auto-detected Monad Testnet from wallet");
      } else {
        console.log("Connected on non-Monad chain:", parsedChainId);
      }
      
      const balance = await fetchEVMBalance(address);

      setState(prev => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
        balance,
        chainId: parsedChainId,
        network: detectedNetwork,
        walletType,
        chainType: "evm",
        authProvider: "injected",
      }));

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", walletType);
      localStorage.setItem("chainType", "evm");
      
      const networkLabel = detectedNetwork === "mainnet" ? "Mainnet" : "Testnet";
      toast.success(`Wallet connected on ${networkLabel}`);
    } catch (error: any) {
      console.error("EVM connect error:", error);
      toast.error(error.message || "Failed to connect");
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [isPhantomAvailable, connectWithSDK, fetchEVMBalance, state.network]);

  // Connect Solana
  const connectSolana = useCallback(async () => {
    if (isPhantomAvailable) {
      try {
        await connectWithSDK("solana");
        return;
      } catch (error) {
        console.warn("SDK connect failed, trying legacy:", error);
      }
    }

    const provider = getSolanaProvider();
    if (!provider) {
      toast.error("Please install Phantom wallet");
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, walletType: "phantom", chainType: "solana" }));

    try {
      const response = await provider.connect();
      const address = response.publicKey.toString();
      const balance = await fetchSolanaBalance(address);

      setState(prev => ({
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
      
      toast.success("Wallet connected");
    } catch (error: any) {
      console.error("Solana connect error:", error);
      toast.error(error.message || "Failed to connect");
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [isPhantomAvailable, connectWithSDK, fetchSolanaBalance]);

  // Main connect function
  const connect = useCallback(async (walletType?: WalletType, chainType?: ChainType) => {
    const targetWallet = walletType || state.walletType || "metamask";
    const targetChain = chainType || state.chainType || "evm";

    if (targetChain === "solana") {
      await connectSolana();
    } else {
      await connectEVM(targetWallet);
    }
  }, [state.walletType, state.chainType, connectEVM, connectSolana]);

  // Connect with OAuth
  const connectWithOAuth = useCallback(async (provider: OAuthProvider, chainType: ChainType) => {
    await connectWithSDK(chainType, provider as AuthProviderType);
  }, [connectWithSDK]);

  // Disconnect
  const disconnect = useCallback(async () => {
    const sdk = getSDK();
    
    try {
      if (sdk.isConnected?.()) await sdk.disconnect();
    } catch {}

    if (state.chainType === "solana") {
      try {
        await getSolanaProvider()?.disconnect();
      } catch {}
    }

    setState(prev => ({
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
    resetPhantomSDK();
    
    toast.success("Wallet disconnected");
  }, [state.chainType, getSDK]);

  // Switch chain
  const switchChain = useCallback(async (chainType: ChainType) => {
    if (chainType === state.chainType) return;
    await disconnect();
    await connect(state.walletType || "phantom", chainType);
  }, [state.chainType, state.walletType, disconnect, connect]);

  // Switch network - actually requests wallet to switch chains
  const switchNetwork = useCallback(async (network: NetworkType) => {
    const targetChain = getMonadChain(network);
    const targetChainId = `0x${targetChain.id.toString(16)}`;
    
    // Update local state first
    setState(prev => ({ ...prev, network }));
    localStorage.setItem("monadNetwork", network);
    
    // If connected on EVM, request wallet to switch chains
    if (state.isConnected && state.chainType === "evm") {
      const provider = getEVMProvider(state.walletType);
      if (provider) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChainId }],
          });
          
          // Update chainId after successful switch
          const newChainId = await provider.request({ method: "eth_chainId" });
          setState(prev => ({ ...prev, chainId: parseInt(newChainId, 16) }));
          
          // Refresh balance
          if (state.address) {
            const balance = await fetchEVMBalance(state.address);
            setState(prev => ({ ...prev, balance }));
          }
        } catch (switchError: any) {
          // Chain not added, try to add it
          if (switchError.code === 4902) {
            try {
              await provider.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: targetChainId,
                  chainName: targetChain.name,
                  nativeCurrency: targetChain.nativeCurrency,
                  rpcUrls: [targetChain.rpcUrls.default.http[0]],
                  blockExplorerUrls: targetChain.blockExplorers ? [targetChain.blockExplorers.default.url] : undefined,
                }],
              });
            } catch (addError) {
              console.error("Failed to add chain:", addError);
              toast.error("Failed to add network to wallet");
              return;
            }
          } else {
            console.error("Failed to switch chain:", switchError);
            toast.error("Failed to switch network in wallet");
            return;
          }
        }
      }
    }
  }, [state.isConnected, state.address, state.chainType, state.walletType, fetchEVMBalance]);

  // Send transaction
  const sendTransaction = useCallback(async (to: string, amount: string): Promise<string | null> => {
    if (state.chainType !== "evm") {
      toast.error("Transactions only supported on EVM");
      return null;
    }

    const provider = getEVMProvider(state.walletType);
    if (!provider || !state.address) {
      toast.error("No wallet connected");
      return null;
    }

    try {
      const amountWei = parseEther(amount);
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: state.address,
          to,
          value: `0x${amountWei.toString(16)}`,
          chainId: `0x${currentChain.id.toString(16)}`,
        }],
      });
      return txHash;
    } catch (error: any) {
      console.error("Transaction error:", error);
      toast.error(error.message || "Transaction failed");
      return null;
    }
  }, [state.chainType, state.walletType, state.address, currentChain.id]);

  // Switch to Monad network
  const switchToMonad = useCallback(async () => {
    if (state.chainType !== "evm" || !state.isConnected) return;
    
    const provider = getEVMProvider(state.walletType);
    if (!provider) return;

    const targetChainId = `0x${currentChain.id.toString(16)}`;
    
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainId }],
      });
    } catch (switchError: any) {
      // Chain not added, try to add it
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: targetChainId,
              chainName: currentChain.name,
              nativeCurrency: currentChain.nativeCurrency,
              rpcUrls: [currentChain.rpcUrls.default.http[0]],
              blockExplorerUrls: currentChain.blockExplorers ? [currentChain.blockExplorers.default.url] : undefined,
            }],
          });
        } catch (addError) {
          console.error("Failed to add chain:", addError);
          toast.error("Failed to add network");
        }
      } else {
        console.error("Failed to switch chain:", switchError);
        toast.error("Failed to switch network");
      }
    }
  }, [state.chainType, state.isConnected, state.walletType, currentChain]);

  // Get EVM provider (for hooks that need direct access)
  const getProvider = useCallback(() => {
    return getEVMProvider(state.walletType);
  }, [state.walletType]);

  // Get Solana provider (for hooks that need direct access)
  const getSolanaProviderCallback = useCallback(() => {
    return getSolanaProvider();
  }, []);

  // Initialize SDK and detect wallets
  useEffect(() => {
    const init = async () => {
      const available = await waitForPhantomExtension(3000);
      setIsPhantomAvailable(available);

      if (available) {
        try {
          const sdk = getSDK();
          await sdk.discoverWallets?.();
          setDiscoveredWallets(sdk.getDiscoveredWallets?.() || []);
        } catch {}
      }
    };
    init();
  }, [getSDK]);

  // Auto-connect
  useEffect(() => {
    const wasConnected = localStorage.getItem("walletConnected") === "true";
    const savedWallet = localStorage.getItem("walletType") as WalletType | null;
    const savedChain = localStorage.getItem("chainType") as ChainType | null;
    const savedAuth = localStorage.getItem("authProvider");

    if (!wasConnected) return;

    const autoConnect = async () => {
      setState(prev => ({ ...prev, isConnecting: true }));

      try {
        // Try SDK auto-connect for Phantom/OAuth
        if (savedWallet === "phantom" || savedAuth === "google" || savedAuth === "apple") {
          const sdk = getSDK();
          if (sdk.autoConnect) {
            const result = await sdk.autoConnect() as unknown as ConnectResult | undefined;
            if (result?.addresses) {
              let address: string | null = null;
              const chainType = savedChain || "evm";
              
              for (const addr of result.addresses) {
                if (chainType === "solana" && addr.addressType === AddressType.solana) {
                  address = addr.address;
                  break;
                } else if (chainType === "evm" && addr.addressType === AddressType.ethereum) {
                  address = addr.address;
                  break;
                }
              }

              if (address) {
                const balance = chainType === "evm" 
                  ? await fetchEVMBalance(address) 
                  : await fetchSolanaBalance(address);

                setState(prev => ({
                  ...prev,
                  address,
                  isConnected: true,
                  isConnecting: false,
                  balance,
                  walletType: "phantom",
                  chainType,
                  authProvider: savedAuth || "injected",
                }));
                return;
              }
            }
          }
        }

        // Legacy auto-connect for MetaMask
        if (savedWallet === "metamask" && window.ethereum?.isMetaMask) {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts?.[0]) {
            const balance = await fetchEVMBalance(accounts[0]);
            setState(prev => ({
              ...prev,
              address: accounts[0],
              isConnected: true,
              isConnecting: false,
              balance,
              walletType: "metamask",
              chainType: "evm",
              authProvider: "injected",
            }));
            return;
          }
        }
      } catch (error) {
        console.error("Auto-connect failed:", error);
      }

      setState(prev => ({ ...prev, isConnecting: false }));
    };

    autoConnect();
  }, [getSDK, fetchEVMBalance, fetchSolanaBalance]);

  // Create stable disconnect ref to avoid closure issues
  const disconnectRef = useRef(disconnect);
  useEffect(() => {
    disconnectRef.current = disconnect;
  }, [disconnect]);

  // Listen for account and chain changes
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Use ref to avoid stale closure
        disconnectRef.current();
      } else if (accounts[0] !== stateRef.current.address && stateRef.current.chainType === "evm") {
        setState(prev => ({ ...prev, address: accounts[0] }));
        fetchEVMBalance(accounts[0]).then(balance => {
          setState(prev => ({ ...prev, balance }));
        });
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      console.log("Chain changed to:", newChainId);
      setState(prev => ({ ...prev, chainId: newChainId }));
      
      // Check if the new chain matches mainnet or testnet
      if (newChainId === 143) {
        setState(prev => ({ ...prev, network: "mainnet" }));
        localStorage.setItem("monadNetwork", "mainnet");
      } else if (newChainId === 10143) {
        setState(prev => ({ ...prev, network: "testnet" }));
        localStorage.setItem("monadNetwork", "testnet");
      }
      
      // Refresh balance on the new chain using stateRef
      const currentAddress = stateRef.current.address;
      if (currentAddress) {
        fetchEVMBalance(currentAddress).then(balance => {
          setState(prev => ({ ...prev, balance }));
        });
      }
    };

    const provider = getEVMProvider(state.walletType);
    provider?.on?.("accountsChanged", handleAccountsChanged);
    provider?.on?.("chainChanged", handleChainChanged);

    return () => {
      provider?.removeListener?.("accountsChanged", handleAccountsChanged);
      provider?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [state.walletType, fetchEVMBalance]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        connectWithOAuth,
        disconnect,
        switchNetwork,
        switchChain,
        switchToMonad,
        sendTransaction,
        getProvider,
        getSolanaProvider: getSolanaProviderCallback,
        currentChain,
        isPhantomAvailable,
        discoveredWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
