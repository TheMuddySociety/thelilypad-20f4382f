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
  isInstalled: boolean;
  installUrl: string;
  supportedChains: ChainType[];
}

interface WalletSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (walletType: WalletType, chainType: ChainType) => void;
  onOAuthSelect?: (provider: OAuthProvider, chainType: ChainType) => void;
  isConnecting: boolean;
}

const oauthOptions = [
  { id: "google" as OAuthProvider, name: "Continue with Google", icon: "🔵" },
  { id: "apple" as OAuthProvider, name: "Continue with Apple", icon: "🍎" },
];

const chainOptions = [
  { id: "evm" as ChainType, name: "Monad (EVM)", icon: "⟠", description: "Connect to Monad network" },
  { id: "solana" as ChainType, name: "Solana", icon: "◎", description: "Connect to Solana network" },
];

export const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  open,
  onOpenChange,
  onSelect,
  onOAuthSelect,
  isConnecting,
}) => {
  const [mode, setMode] = useState<"wallet" | "chain">("wallet");
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [selectedOAuth, setSelectedOAuth] = useState<OAuthProvider | null>(null);
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [discoveredWallets, setDiscoveredWallets] = useState<InjectedWalletInfo[]>([]);

  // Detect wallets on open
  useEffect(() => {
    if (!open) return;

    const detect = async () => {
      const phantomAvailable = await waitForPhantomExtension(2000);
      let discovered: InjectedWalletInfo[] = [];

      if (phantomAvailable) {
        try {
          const sdk = getPhantomSDK();
          await sdk.discoverWallets?.();
          discovered = sdk.getDiscoveredWallets?.() || [];
          setDiscoveredWallets(discovered);
        } catch {}
      }

      const hasMetaMask = window.ethereum?.isMetaMask || 
        discovered.some(w => w.name.toLowerCase().includes("metamask"));
      const hasPhantom = phantomAvailable || 
        discovered.some(w => w.name.toLowerCase().includes("phantom"));

      setWalletOptions([
        {
          id: "metamask",
          name: "MetaMask",
          icon: "🦊",
          isInstalled: !!hasMetaMask,
          installUrl: "https://metamask.io/download/",
          supportedChains: ["evm"],
        },
        {
          id: "phantom",
          name: "Phantom",
          icon: "👻",
          isInstalled: !!hasPhantom,
          installUrl: "https://phantom.app/download",
          supportedChains: ["evm", "solana"],
        },
      ]);
    };

    detect();
  }, [open]);

  const handleWalletClick = (wallet: WalletOption) => {
    if (!wallet.isInstalled) {
      window.open(wallet.installUrl, "_blank");
      return;
    }

    if (wallet.supportedChains.length === 1) {
      onSelect(wallet.id, wallet.supportedChains[0]);
      reset();
      return;
    }

    setSelectedWallet(wallet.id);
    setMode("chain");
  };

  const handleOAuthClick = (provider: OAuthProvider) => {
    setSelectedOAuth(provider);
    setMode("chain");
  };

  const handleChainSelect = (chain: ChainType) => {
    if (selectedWallet) {
      onSelect(selectedWallet, chain);
    } else if (selectedOAuth && onOAuthSelect) {
      onOAuthSelect(selectedOAuth, chain);
    }
    reset();
  };

  const reset = () => {
    setMode("wallet");
    setSelectedWallet(null);
    setSelectedOAuth(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) reset();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {mode === "wallet" ? "Connect Wallet" : "Select Network"}
          </DialogTitle>
          <DialogDescription>
            {mode === "wallet" 
              ? "Choose how to connect to The Lily Pad" 
              : "Choose which network to use"}
          </DialogDescription>
        </DialogHeader>

        {mode === "wallet" ? (
          <div className="flex flex-col gap-3 mt-4">
            {/* OAuth */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                No extension? Sign in with
              </p>
              {oauthOptions.map((oauth) => (
                <Button
                  key={oauth.id}
                  variant="outline"
                  className="w-full h-12 justify-start gap-3"
                  onClick={() => handleOAuthClick(oauth.id)}
                  disabled={isConnecting || !onOAuthSelect}
                >
                  <span>{oauth.icon}</span>
                  <span className="font-medium">{oauth.name}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">Embedded</Badge>
                </Button>
              ))}
            </div>

            <div className="relative my-2">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                or use extension
              </span>
            </div>

            {/* Wallets */}
            {walletOptions.map((wallet) => (
              <Button
                key={wallet.id}
                variant="outline"
                className="w-full h-14 justify-start gap-4"
                onClick={() => handleWalletClick(wallet)}
                disabled={isConnecting}
              >
                <span className="text-2xl">{wallet.icon}</span>
                <div className="flex flex-col items-start flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{wallet.name}</span>
                    {wallet.supportedChains.length > 1 && (
                      <Badge variant="secondary" className="text-[10px]">Multi-chain</Badge>
                    )}
                  </div>
                </div>
                {!wallet.isInstalled ? (
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </Button>
            ))}

            {/* Other discovered wallets */}
            {discoveredWallets
              .filter(w => !w.name.toLowerCase().includes("metamask") && !w.name.toLowerCase().includes("phantom"))
              .map((wallet) => (
                <Button
                  key={wallet.id}
                  variant="outline"
                  className="w-full h-14 justify-start gap-4 opacity-60"
                  disabled
                >
                  {wallet.icon ? (
                    <img src={wallet.icon} alt={wallet.name} className="w-6 h-6" />
                  ) : (
                    <span className="text-2xl">💳</span>
                  )}
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-semibold">{wallet.name}</span>
                    <span className="text-xs text-muted-foreground">Not yet supported</span>
                  </div>
                </Button>
              ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-4">
            <Button variant="ghost" size="sm" className="w-fit" onClick={() => setMode("wallet")}>
              ← Back
            </Button>
            {chainOptions.map((chain) => (
              <Button
                key={chain.id}
                variant="outline"
                className="w-full h-16 justify-start gap-4"
                onClick={() => handleChainSelect(chain.id)}
                disabled={isConnecting}
              >
                <span className="text-2xl">{chain.icon}</span>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{chain.name}</span>
                  <span className="text-xs text-muted-foreground">{chain.description}</span>
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
