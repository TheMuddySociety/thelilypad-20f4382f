import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPhantomSDK, waitForPhantomExtension } from "@/config/phantom";
import type { InjectedWalletInfo } from "@phantom/browser-sdk";

export type WalletType = "metamask" | "phantom";
export type ChainType = "evm" | "solana";
export type OAuthProvider = "google" | "apple";

interface WalletOption {
  id: WalletType;
  name: string;
  icon: string;
  description: string;
  isInstalled: boolean;
  installUrl: string;
  supportedChains: ChainType[];
}

interface OAuthOption {
  id: OAuthProvider;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface ChainOption {
  id: ChainType;
  name: string;
  icon: string;
  description: string;
}

interface WalletSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (walletType: WalletType, chainType: ChainType) => void;
  onOAuthSelect?: (provider: OAuthProvider, chainType: ChainType) => void;
  isConnecting: boolean;
}

// Legacy detection (fallback)
const detectWalletsLegacy = (): { metamask: boolean; phantom: boolean } => {
  const isMetaMaskInstalled = typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
  const isPhantomEVMInstalled = typeof window.phantom?.ethereum !== "undefined" || 
    (typeof window.ethereum !== "undefined" && window.ethereum.isPhantom);
  const isPhantomSolanaInstalled = typeof window.phantom?.solana !== "undefined" ||
    typeof window.solana !== "undefined";

  return {
    metamask: !!isMetaMaskInstalled,
    phantom: !!isPhantomEVMInstalled || !!isPhantomSolanaInstalled,
  };
};

const oauthOptions: OAuthOption[] = [
  {
    id: "google",
    name: "Continue with Google",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    description: "Sign in with your Google account",
  },
  {
    id: "apple",
    name: "Continue with Apple",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    ),
    description: "Sign in with your Apple ID",
  },
];

const chainOptions: ChainOption[] = [
  {
    id: "evm",
    name: "Monad (EVM)",
    icon: "⟠",
    description: "Connect to Monad network",
  },
  {
    id: "solana",
    name: "Solana",
    icon: "◎",
    description: "Connect to Solana network",
  },
];

type SelectionMode = "wallet" | "oauth" | "chain";

export const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  open,
  onOpenChange,
  onSelect,
  onOAuthSelect,
  isConnecting,
}) => {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("wallet");
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [selectedOAuth, setSelectedOAuth] = useState<OAuthProvider | null>(null);
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [discoveredWallets, setDiscoveredWallets] = useState<InjectedWalletInfo[]>([]);
  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false);

  // Initialize wallet detection using SDK
  useEffect(() => {
    const detectWallets = async () => {
      // Check Phantom SDK availability
      const phantomAvailable = await waitForPhantomExtension(2000);
      setIsPhantomAvailable(phantomAvailable);

      let discovered: InjectedWalletInfo[] = [];
      
      if (phantomAvailable) {
        try {
          const sdk = getPhantomSDK();
          await sdk.discoverWallets();
          discovered = sdk.getDiscoveredWallets();
          setDiscoveredWallets(discovered);
        } catch (error) {
          console.warn("SDK wallet discovery failed:", error);
        }
      }

      // Build wallet options
      const legacyDetection = detectWalletsLegacy();
      
      // Check if MetaMask is in discovered wallets or via legacy
      const hasMetaMask = discovered.some(w => 
        w.id.toLowerCase().includes("metamask") || w.name.toLowerCase().includes("metamask")
      ) || legacyDetection.metamask;

      // Check if Phantom is in discovered wallets or via legacy
      const hasPhantom = discovered.some(w => 
        w.id.toLowerCase().includes("phantom") || w.name.toLowerCase().includes("phantom")
      ) || legacyDetection.phantom || phantomAvailable;

      setWalletOptions([
        {
          id: "metamask",
          name: "MetaMask",
          icon: "🦊",
          description: "Connect using MetaMask browser extension",
          isInstalled: hasMetaMask,
          installUrl: "https://metamask.io/download/",
          supportedChains: ["evm"],
        },
        {
          id: "phantom",
          name: "Phantom",
          icon: "👻",
          description: "Connect using Phantom wallet (EVM & Solana)",
          isInstalled: hasPhantom,
          installUrl: "https://phantom.app/download",
          supportedChains: ["evm", "solana"],
        },
      ]);
    };

    if (open) {
      detectWallets();
    }
  }, [open]);

  const handleWalletClick = (wallet: WalletOption) => {
    if (!wallet.isInstalled) {
      window.open(wallet.installUrl, "_blank");
      return;
    }
    
    // If wallet only supports one chain, select it directly
    if (wallet.supportedChains.length === 1) {
      onSelect(wallet.id, wallet.supportedChains[0]);
      resetState();
      return;
    }
    
    // Show chain selection for multi-chain wallets
    setSelectedWallet(wallet.id);
    setSelectionMode("chain");
  };

  const handleOAuthClick = (oauth: OAuthOption) => {
    // OAuth always supports both chains via Phantom embedded wallet
    setSelectedOAuth(oauth.id);
    setSelectionMode("chain");
  };

  const handleChainSelect = (chainType: ChainType) => {
    if (selectedWallet) {
      onSelect(selectedWallet, chainType);
    } else if (selectedOAuth && onOAuthSelect) {
      onOAuthSelect(selectedOAuth, chainType);
    }
    resetState();
  };

  const handleBack = () => {
    setSelectedWallet(null);
    setSelectedOAuth(null);
    setSelectionMode("wallet");
  };

  const resetState = () => {
    setSelectedWallet(null);
    setSelectedOAuth(null);
    setSelectionMode("wallet");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const selectedWalletData = walletOptions.find(w => w.id === selectedWallet);
  const selectedOAuthData = oauthOptions.find(o => o.id === selectedOAuth);

  const getTitle = () => {
    if (selectionMode === "chain") {
      if (selectedOAuth) return "Select Network";
      return "Select Network";
    }
    return "Connect Wallet";
  };

  const getDescription = () => {
    if (selectionMode === "chain") {
      if (selectedOAuth) {
        return `Choose which network to use with ${selectedOAuthData?.name.replace("Continue with ", "")}`;
      }
      return `Choose which network to connect with ${selectedWalletData?.name}`;
    }
    return "Choose how to connect to The Lily Pad";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        
        {selectionMode === "wallet" ? (
          // Main Selection (OAuth + Wallets)
          <div className="flex flex-col gap-3 mt-4">
            {/* OAuth Options */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                No extension? Sign in with
              </p>
              {oauthOptions.map((oauth) => (
                <Button
                  key={oauth.id}
                  variant="outline"
                  className="w-full h-auto py-3 px-4 justify-start gap-3 hover:bg-accent/50"
                  onClick={() => handleOAuthClick(oauth)}
                  disabled={isConnecting || !onOAuthSelect}
                >
                  <span className="flex-shrink-0">{oauth.icon}</span>
                  <div className="flex flex-col items-start text-left flex-1">
                    <span className="font-medium text-sm">{oauth.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Embedded
                  </Badge>
                </Button>
              ))}
            </div>

            <div className="relative my-2">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                or use extension
              </span>
            </div>

            {/* Wallet Extension Options */}
            {walletOptions.map((wallet) => (
              <Button
                key={wallet.id}
                variant="outline"
                className="w-full h-auto py-4 px-4 justify-start gap-4 hover:bg-accent/50"
                onClick={() => handleWalletClick(wallet)}
                disabled={isConnecting}
              >
                <span className="text-2xl">{wallet.icon}</span>
                <div className="flex flex-col items-start text-left flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{wallet.name}</span>
                    {wallet.supportedChains.includes("solana") && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Multi-chain
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {wallet.description}
                  </span>
                </div>
                {!wallet.isInstalled && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <span>Install</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
                {wallet.isInstalled && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </Button>
            ))}
            
            {/* Show other discovered wallets */}
            {discoveredWallets
              .filter(w => !w.id.toLowerCase().includes("metamask") && !w.id.toLowerCase().includes("phantom"))
              .map((wallet) => (
                <Button
                  key={wallet.id}
                  variant="outline"
                  className="w-full h-auto py-4 px-4 justify-start gap-4 hover:bg-accent/50 opacity-60"
                  disabled
                >
                  {wallet.icon ? (
                    <img src={wallet.icon} alt={wallet.name} className="w-6 h-6" />
                  ) : (
                    <span className="text-2xl">💳</span>
                  )}
                  <div className="flex flex-col items-start text-left flex-1">
                    <span className="font-semibold">{wallet.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Detected wallet (not yet supported)
                    </span>
                  </div>
                </Button>
              ))}
          </div>
        ) : (
          // Chain Selection
          <div className="flex flex-col gap-3 mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-fit text-muted-foreground"
              onClick={handleBack}
            >
              ← Back
            </Button>
            {chainOptions.map((chain) => (
              <Button
                key={chain.id}
                variant="outline"
                className="w-full h-auto py-4 px-4 justify-start gap-4 hover:bg-accent/50"
                onClick={() => handleChainSelect(chain.id)}
                disabled={isConnecting}
              >
                <span className="text-2xl">{chain.icon}</span>
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="font-semibold">{chain.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {chain.description}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          By connecting, you agree to our Terms of Service
        </p>
      </DialogContent>
    </Dialog>
  );
};
