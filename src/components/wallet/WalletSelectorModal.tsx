import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, ExternalLink, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPhantomSDK, waitForPhantomExtension } from "@/config/phantom";
import type { InjectedWalletInfo } from "@phantom/browser-sdk";

export type WalletType = "phantom" | "solana";
export type ChainType = "solana";
export type OAuthProvider = "google" | "apple";

interface WalletOption {
  id: WalletType;
  name: string;
  icon: string;
  isInstalled: boolean;
  installUrl: string;
}

interface WalletSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (walletType: WalletType) => void;
  onOAuthSelect?: (provider: OAuthProvider) => void;
  isConnecting: boolean;
}

const oauthOptions = [
  { id: "google" as OAuthProvider, name: "Continue with Google", icon: "🔵" },
  { id: "apple" as OAuthProvider, name: "Continue with Apple", icon: "🍎" },
];

export const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  open,
  onOpenChange,
  onSelect,
  onOAuthSelect,
  isConnecting,
}) => {
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [discoveredWallets, setDiscoveredWallets] = useState<InjectedWalletInfo[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initWallets = async () => {
      setIsInitializing(true);
      
      try {
        // Wait for Phantom extension
        await waitForPhantomExtension(2000);
        
        // Get Phantom SDK
        const sdk = getPhantomSDK();
        if (sdk) {
          const wallets = await sdk.wallets.getInjectedWallets();
          setDiscoveredWallets(wallets);
        }
        
        // Check Phantom availability
        const isPhantomInstalled = !!(window as any).phantom?.solana?.isPhantom;
        
        const options: WalletOption[] = [
          {
            id: "phantom",
            name: "Phantom",
            icon: "👻",
            isInstalled: isPhantomInstalled,
            installUrl: "https://phantom.app/",
          },
        ];
        
        setWalletOptions(options);
      } catch (e) {
        console.error("Error initializing wallets:", e);
        // Fallback
        setWalletOptions([
          {
            id: "phantom",
            name: "Phantom",
            icon: "👻",
            isInstalled: false,
            installUrl: "https://phantom.app/",
          },
        ]);
      }
      
      setIsInitializing(false);
    };

    if (open) {
      initWallets();
    }
  }, [open]);

  const handleWalletClick = (wallet: WalletOption) => {
    if (!wallet.isInstalled) {
      window.open(wallet.installUrl, "_blank");
      return;
    }
    onSelect(wallet.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Connect your Solana wallet to get started
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Solana Network Badge */}
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
              <span className="mr-1">◎</span>
              Solana Network
            </Badge>
          </div>

          {/* OAuth Options */}
          {onOAuthSelect && (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Quick sign in
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {oauthOptions.map((option) => (
                    <Button
                      key={option.id}
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => onOAuthSelect(option.id)}
                      disabled={isConnecting}
                    >
                      <span>{option.icon}</span>
                      <span className="text-sm">{option.id === "google" ? "Google" : "Apple"}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or with wallet
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Wallet Options */}
          <div className="space-y-2">
            {isInitializing ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {walletOptions.map((wallet) => (
                  <Button
                    key={wallet.id}
                    variant="outline"
                    className="w-full justify-between h-14"
                    onClick={() => handleWalletClick(wallet)}
                    disabled={isConnecting}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{wallet.icon}</span>
                      <div className="text-left">
                        <div className="font-medium">{wallet.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {wallet.isInstalled ? "Detected" : "Not installed"}
                        </div>
                      </div>
                    </div>
                    {!wallet.isInstalled && (
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    )}
                    {wallet.isInstalled && isConnecting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    )}
                  </Button>
                ))}

                {/* Monad Coming Soon */}
                <div className="mt-4 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Monad (EVM) support coming soon</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Discovered wallets from SDK */}
          {discoveredWallets.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              {discoveredWallets.length} wallet(s) detected via Phantom SDK
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
