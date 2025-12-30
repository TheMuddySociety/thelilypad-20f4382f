import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, ExternalLink } from "lucide-react";

export type WalletType = "metamask" | "phantom";

interface WalletOption {
  id: WalletType;
  name: string;
  icon: string;
  description: string;
  isInstalled: boolean;
  installUrl: string;
}

interface WalletSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (walletType: WalletType) => void;
  isConnecting: boolean;
}

const getWalletOptions = (): WalletOption[] => {
  const isMetaMaskInstalled = typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
  const isPhantomInstalled = typeof window.phantom?.ethereum !== "undefined" || 
    (typeof window.ethereum !== "undefined" && window.ethereum.isPhantom);

  return [
    {
      id: "metamask",
      name: "MetaMask",
      icon: "🦊",
      description: "Connect using MetaMask browser extension",
      isInstalled: !!isMetaMaskInstalled,
      installUrl: "https://metamask.io/download/",
    },
    {
      id: "phantom",
      name: "Phantom",
      icon: "👻",
      description: "Connect using Phantom wallet",
      isInstalled: !!isPhantomInstalled,
      installUrl: "https://phantom.app/download",
    },
  ];
};

export const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  open,
  onOpenChange,
  onSelect,
  isConnecting,
}) => {
  const walletOptions = getWalletOptions();

  const handleWalletClick = (wallet: WalletOption) => {
    if (wallet.isInstalled) {
      onSelect(wallet.id);
    } else {
      window.open(wallet.installUrl, "_blank");
    }
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
            Choose a wallet to connect to The Lily Pad
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
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
                <span className="font-semibold">{wallet.name}</span>
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
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          By connecting, you agree to our Terms of Service
        </p>
      </DialogContent>
    </Dialog>
  );
};
