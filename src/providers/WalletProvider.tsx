import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { NetworkType, getSolanaRpcUrl } from "@/config/solana";
import { getPhantomSDK, waitForPhantomExtension, AddressType, resetPhantomSDK } from "@/config/phantom";
import type { BrowserSDK, ConnectResult, InjectedWalletInfo, AuthProviderType } from "@phantom/browser-sdk";
import { toast } from "sonner";
import { Connection, PublicKey } from "@solana/web3.js";
import { useChain } from "./ChainProvider";
import { supabase } from "@/integrations/supabase/client";
import {
  generateXRPLWallet,
  importXRPLWallet,
  saveXRPLWallet,
  loadXRPLWallet,
  clearXRPLWallet,
  fetchXRPBalance,
  type StoredXRPLWallet,
  type XRPLNetworkType,
  getXRPLNetwork,
} from "@/lib/xrpl-wallet";

// Types
export type WalletType = "phantom" | "solana" | "xrpl";
export type ChainType = "solana" | "xrpl" | "monad";
export type OAuthProvider = "google" | "apple";


interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isTransactionPending: boolean;
  balance: string | null;
  network: NetworkType;
  walletType: WalletType | null;
  chainType: ChainType;
  authProvider?: string;
  isNewAccount?: boolean;
}

interface WalletContextType extends WalletState {
  connect: (walletType?: WalletType, chainType?: ChainType) => Promise<void>;
  connectWithOAuth: (provider: OAuthProvider) => Promise<void>;
  disconnect: () => void;
  switchNetwork: (network: NetworkType) => Promise<void>;
  getSolanaProvider: () => any;
  setTransactionPending: (pending: boolean) => void;
  isPhantomAvailable: boolean;
  discoveredWallets: InjectedWalletInfo[];
  connection: Connection;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

// Get Solana provider
const getSolanaProvider = () => {
  // Check for window.solana (generic) or window.phantom.solana (specific)
  if (typeof window !== "undefined") {
    if ("phantom" in window && (window as any).phantom?.solana) {
      return (window as any).phantom.solana;
    }
    if ("solana" in window) {
      return (window as any).solana;
    }
  }
  return null;
};

// Format Solana balance
const formatSolanaBalance = (lamports: number): string => {
  return (lamports / 1_000_000_000).toFixed(4);
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Access chain context to validate wallet compatibility
  const { chain } = useChain();

  const [state, setState] = useState<WalletState>(() => ({
    address: null,
    isConnected: false,
    isConnecting: false,
    isTransactionPending: false,
    balance: null,
    network: (localStorage.getItem("solanaNetwork") as NetworkType) || "devnet",
    walletType: "phantom",
    chainType: "solana",
  }));

  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false);
  const [discoveredWallets, setDiscoveredWallets] = useState<InjectedWalletInfo[]>([]);
  const sdkRef = useRef<BrowserSDK | null>(null);

  // Create Connection object
  const connection = useMemo(() => {
    return new Connection(getSolanaRpcUrl(state.network), 'confirmed');
  }, [state.network]);

  const getSDK = useCallback(() => {
    if (!sdkRef.current) {
      sdkRef.current = getPhantomSDK();
    }
    return sdkRef.current;
  }, []);

  // Fetch Solana balance
  const fetchSolanaBalance = useCallback(async (address: string) => {
    try {
      const balance = await connection.getBalance(new PublicKey(address));
      return formatSolanaBalance(balance);
    } catch (error) {
      console.error("Error fetching Solana balance:", error);
      return null;
    }
  }, [connection]);

  // Connect with SDK (Phantom)
  const connectWithSDK = useCallback(async (provider?: AuthProviderType) => {
    const sdk = getSDK();
    setState(prev => ({ ...prev, isConnecting: true, walletType: "phantom", chainType: "solana" }));

    try {
      const result: ConnectResult = await sdk.connect({ provider: provider || "injected" });

      let address: string | null = null;
      // Look for Solana address
      for (const addr of result.addresses) {
        if (addr.addressType === AddressType.solana) {
          address = addr.address;
          break;
        }
      }

      if (!address) throw new Error(`No Solana address found in wallet`);

      const balance = await fetchSolanaBalance(address);

      // Auto-create Supabase auth session for wallet-only users
      try {
        const { data: { user: existingUser } } = await supabase.auth.getUser();
        if (!existingUser) {
          // Sign in anonymously to create auth session
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously({
            options: {
              data: {
                wallet_address: address,
                wallet_type: 'phantom'
              }
            }
          });

          if (authError) {
            console.error('Auto auth creation failed:', authError);
          } else {
            console.log('Auto-created auth session for wallet:', address);
          }
        }
      } catch (authErr) {
        console.error('Auth session check failed:', authErr);
        // Continue anyway - wallet is still connected
      }

      setState(prev => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
        balance,
        walletType: "phantom",
        chainType: "solana",
        authProvider: result.authProvider || (provider as string) || "injected",
      }));

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", "phantom");
      // Default to solana

      const networkLabel = state.network === "mainnet" ? "Mainnet" : "Testnet";
      toast.success(`Wallet connected on ${networkLabel}`);
    } catch (error: any) {
      console.error("SDK connect error:", error);
      setState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  }, [getSDK, fetchSolanaBalance, state.network]);


  // Connect Solana (Legacy method - Phantom injected provider)
  const connectSolanaLegacy = useCallback(async () => {
    const provider = getSolanaProvider();
    if (!provider) {
      throw new Error("Solana wallet not found");
    }

    setState(prev => ({ ...prev, isConnecting: true, walletType: "solana", chainType: "solana" }));

    try {
      // Phantom/Solana provider connect
      const response = await provider.connect();
      const address = response.publicKey.toString();
      const balance = await fetchSolanaBalance(address);

      // Auto-create Supabase auth session for wallet-only users
      try {
        const { data: { user: existingUser } } = await supabase.auth.getUser();
        if (!existingUser) {
          await supabase.auth.signInAnonymously({
            options: {
              data: {
                wallet_address: address,
                wallet_type: 'solana'
              }
            }
          });
        }
      } catch (authErr) {
        console.error('Auth session check failed:', authErr);
      }

      setState(prev => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
        balance,
        walletType: "solana",
        chainType: "solana",
        authProvider: "injected",
      }));

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", "solana");

      toast.success("Wallet connected on Solana");
    } catch (error: any) {
      console.error("Solana connect error:", error);

      const message = (error?.message || "").toString();
      const code = error?.code;

      // Common Phantom errors
      const isUserRejected = code === 4001 || message.toLowerCase().includes("rejected");
      const isInternalRpcError = code === -32603 || message.toLowerCase().includes("internal json-rpc");

      if (isUserRejected) {
        toast.error("Connection rejected");
      } else if (isInternalRpcError) {
        toast.error("Phantom returned an internal error. Please unlock Phantom, then try again.");
      } else {
        toast.error(message || "Failed to connect to Solana");
      }

      setState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  }, [fetchSolanaBalance]);

  // Connect XRPL wallet (non-custodial browser wallet)
  const connectXRPL = useCallback(async (action: 'generate' | 'import' = 'generate', seed?: string) => {
    setState(prev => ({ ...prev, isConnecting: true, walletType: "xrpl", chainType: "xrpl" }));

    try {
      let walletData: StoredXRPLWallet;

      // Check for existing stored wallet first
      const stored = loadXRPLWallet();
      if (stored && action === 'generate') {
        walletData = stored;
      } else if (action === 'import' && seed) {
        walletData = importXRPLWallet(seed);
      } else {
        walletData = generateXRPLWallet();
      }

      saveXRPLWallet(walletData);

      const network = getXRPLNetwork();
      let balance = '0';
      try {
        balance = await fetchXRPBalance(walletData.address, network);
      } catch {
        // New accounts may not be funded yet
      }

      // Auto-create Supabase auth session
      try {
        const { data: { user: existingUser } } = await supabase.auth.getUser();
        if (!existingUser) {
          await supabase.auth.signInAnonymously({
            options: {
              data: {
                wallet_address: walletData.address,
                wallet_type: 'xrpl'
              }
            }
          });
        }
      } catch (authErr) {
        console.error('Auth session check failed:', authErr);
      }

      setState(prev => ({
        ...prev,
        address: walletData.address,
        isConnected: true,
        isConnecting: false,
        balance,
        walletType: "xrpl",
        chainType: "xrpl",
        authProvider: "xrpl-browser",
      }));

      localStorage.setItem("walletConnected", "true");
      localStorage.setItem("walletType", "xrpl");

      toast.success(`XRPL wallet connected on ${network}`);
    } catch (error: any) {
      console.error("XRPL connect error:", error);
      setState(prev => ({ ...prev, isConnecting: false }));
      toast.error(error?.message || "Failed to connect XRPL wallet");
      throw error;
    }
  }, []);

  // Main connect function
  const connect = useCallback(async (_walletType?: WalletType, _chainType?: ChainType) => {
    // If explicitly requesting XRPL, use XRPL wallet
    if (_walletType === 'xrpl' || _chainType === 'xrpl') {
      await connectXRPL();
      return;
    }

    // Prefer injected Solana provider first (most reliable for Phantom extension)
    const injected = getSolanaProvider();
    if (injected) {
      try {
        await connectSolanaLegacy();
        return;
      } catch (err: any) {
        // If user rejected, don't fallback to other methods
        if (err?.code === 4001 || err?.message?.toLowerCase().includes("rejected")) return;

        // Cleanup in case Phantom/provider is in a weird state
        try {
          await injected.disconnect?.();
        } catch { /* noop */ }
      }
    }

    // If no injected provider, or it failed, try Phantom SDK (OAuth/embedded)
    if (isPhantomAvailable) {
      try {
        await connectWithSDK();
        return;
      } catch (err: any) {
        console.warn("SDK connect failed:", err?.message || err);

        // Reset SDK instance and allow retry next time
        sdkRef.current = null;
        resetPhantomSDK();

        if (err?.code === 4001 || err?.message?.toLowerCase().includes("rejected")) {
          toast.error("Connection rejected by user");
          return;
        }

        toast.error(err?.message || "Failed to connect wallet. Please try again.");
        return;
      }
    }

    toast.error("Phantom wallet not found. Please install Phantom extension.");
  }, [isPhantomAvailable, connectWithSDK, connectSolanaLegacy, connectXRPL]);

  // Connect with OAuth
  const connectWithOAuth = useCallback(async (provider: OAuthProvider) => {
    await connectWithSDK(provider as AuthProviderType);
  }, [connectWithSDK]);

  // Disconnect
  const disconnect = useCallback(async () => {
    // Handle XRPL disconnect
    if (state.walletType === 'xrpl') {
      // Don't clear the stored wallet - just disconnect session
      // User can reconnect with same wallet
    } else {
      const sdk = getSDK();
      try {
        if (sdk.isConnected?.()) await sdk.disconnect();
      } catch { }

      try {
        await getSolanaProvider()?.disconnect();
      } catch { }

      resetPhantomSDK();
    }

    setState(prev => ({
      ...prev,
      address: null,
      isConnected: false,
      isConnecting: false,
      balance: null,
      authProvider: undefined,
    }));

    localStorage.removeItem("walletConnected");
    localStorage.removeItem("walletType");
    localStorage.removeItem("authProvider");

    toast.success("Wallet disconnected");
  }, [getSDK, state.walletType]);

  // Switch Solana network (mainnet or devnet)
  const switchNetwork = useCallback(async (network: NetworkType) => {
    setState(prev => ({ ...prev, network }));
    localStorage.setItem("solanaNetwork", network);
    toast.success(`Switched to ${network}`);

    // Refresh balance
    if (state.address) {
      // We can't await here easily without effect, but connection will update due to state.network dep
      // and balance fetch might need to be triggered manually or via effect.
      // For now rely on simple state update.
    }
  }, [state.address]);

  // Helper to get raw provider
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
        } catch { }
      }
    };
    init();
  }, [getSDK]);

  // Auto-connect
  useEffect(() => {
    const wasConnected = localStorage.getItem("walletConnected") === "true";

    if (!wasConnected) return;

    const autoConnect = async () => {
      setState(prev => ({ ...prev, isConnecting: true }));
      try {
        const storedWalletType = localStorage.getItem("walletType");

        // Auto-connect XRPL if that was the last wallet type
        if (storedWalletType === 'xrpl') {
          const xrplWallet = loadXRPLWallet();
          if (xrplWallet) {
            const network = getXRPLNetwork();
            let balance = '0';
            try { balance = await fetchXRPBalance(xrplWallet.address, network); } catch {}
            setState(prev => ({
              ...prev,
              address: xrplWallet.address,
              isConnected: true,
              isConnecting: false,
              balance,
              walletType: "xrpl",
              chainType: "xrpl",
              authProvider: "xrpl-browser",
            }));
            return;
          }
        }

        // Attempt silent connect for Solana
        if (isPhantomAvailable) {
          const sdk = getSDK();
          if (sdk.autoConnect) {
            const result = await sdk.autoConnect() as unknown as ConnectResult | undefined;
            if (result?.addresses) {
              const addr = result.addresses.find(a => a.addressType === AddressType.solana);
              if (addr) {
                const address = addr.address;
                const balance = await fetchSolanaBalance(address);
                setState(prev => ({
                  ...prev,
                  address,
                  isConnected: true,
                  isConnecting: false,
                  balance,
                  walletType: "phantom",
                  chainType: "solana",
                  authProvider: result.authProvider || "injected",
                }));
                return;
              }
            }
          }
        }

        // Try legacy if SDK failed or not available (but wasConnected is true)
        const provider = getSolanaProvider();
        if (provider) {
          const resp = await provider.connect({ onlyIfTrusted: true }); // Silent connect
          const address = resp.publicKey.toString();
          const balance = await fetchSolanaBalance(address);
          setState(prev => ({
            ...prev,
            address,
            isConnected: true,
            isConnecting: false,
            balance,
            walletType: "solana",
            chainType: "solana",
            authProvider: "injected",
          }));
        }
      } catch (err) {
        console.error("Auto connect failed", err);
      }
      setState(prev => ({ ...prev, isConnecting: false }));
    };

    autoConnect();
  }, [getSDK, fetchSolanaBalance, isPhantomAvailable]);

  // Chain-Wallet Compatibility Validation
  useEffect(() => {
    if (!state.isConnected || !state.address) return;

    // Check if current wallet type matches selected chain
    const isCompatible =
      (chain.id === 'solana' && (state.walletType === 'phantom' || state.walletType === 'solana')) ||
      (chain.id === 'xrpl' && state.walletType === 'phantom') || // Will update when XRPL-specific wallet added
      (chain.id === 'monad' && state.walletType === 'phantom'); // Will update when EVM wallets added

    if (!isCompatible) {
      toast.warning(`Wallet may not be compatible with ${chain.name}`, {
        description: `Try using ${chain.walletLabels.connect.replace('Connect ', '')} for ${chain.name}`,
        duration: 5000,
      });
    }
  }, [chain.id, chain.name, chain.walletLabels.connect, state.isConnected, state.walletType, state.address]);

  const setTransactionPending = useCallback((pending: boolean) => {
    setState(prev => ({ ...prev, isTransactionPending: pending }));
  }, []);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        connectWithOAuth,
        disconnect,
        switchNetwork,
        getSolanaProvider: getSolanaProviderCallback,
        setTransactionPending,
        isPhantomAvailable,
        discoveredWallets,
        connection
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
