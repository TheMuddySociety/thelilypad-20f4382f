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
import { Badge } from "@/components/ui/badge";

export type WalletType = "metamask" | "phantom";
export type ChainType = "evm" | "solana";

interface WalletOption {
  id: WalletType;
  name: string;
  icon: string;
  description: string;
  isInstalled: boolean;
  installUrl: string;
  supportedChains: ChainType[];
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
  isConnecting: boolean;
}

const getWalletOptions = (): WalletOption[] => {
  const isMetaMaskInstalled = typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
  const isPhantomEVMInstalled = typeof window.phantom?.ethereum !== "undefined" || 
    (typeof window.ethereum !== "undefined" && window.ethereum.isPhantom);
  const isPhantomSolanaInstalled = typeof window.phantom?.solana !== "undefined" ||
    typeof window.solana !== "undefined";

  return [
    {
      id: "metamask",
      name: "MetaMask",
      icon: "🦊",
      description: "Connect using MetaMask browser extension",
      isInstalled: !!isMetaMaskInstalled,
      installUrl: "https://metamask.io/download/",
      supportedChains: ["evm"],
    },
    {
      id: "phantom",
      name: "Phantom",
      icon: "👻",
      description: "Connect using Phantom wallet (EVM & Solana)",
      isInstalled: !!isPhantomEVMInstalled || !!isPhantomSolanaInstalled,
      installUrl: "https://phantom.app/download",
      supportedChains: ["evm", "solana"],
    },
  ];
};

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

export const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  open,
  onOpenChange,
  onSelect,
  isConnecting,
}) => {
  const [selectedWallet, setSelectedWallet] = React.useState<WalletType | null>(null);
  const walletOptions = getWalletOptions();

  const handleWalletClick = (wallet: WalletOption) => {
    if (!wallet.isInstalled) {
      window.open(wallet.installUrl, "_blank");
      return;
    }
    
    // If wallet only supports one chain, select it directly
    if (wallet.supportedChains.length === 1) {
      onSelect(wallet.id, wallet.supportedChains[0]);
      setSelectedWallet(null);
      return;
    }
    
    // Show chain selection for multi-chain wallets
    setSelectedWallet(wallet.id);
  };

  const handleChainSelect = (chainType: ChainType) => {
    if (selectedWallet) {
      onSelect(selectedWallet, chainType);
      setSelectedWallet(null);
    }
  };

  const handleBack = () => {
    setSelectedWallet(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedWallet(null);
    }
    onOpenChange(newOpen);
  };

  const selectedWalletData = walletOptions.find(w => w.id === selectedWallet);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {selectedWallet ? "Select Network" : "Connect Wallet"}
          </DialogTitle>
          <DialogDescription>
            {selectedWallet 
              ? `Choose which network to connect with ${selectedWalletData?.name}`
              : "Choose a wallet to connect to The Lily Pad"
            }
          </DialogDescription>
        </DialogHeader>
        
        {!selectedWallet ? (
          // Wallet Selection
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
              ← Back to wallets
            </Button>
            {chainOptions
              .filter(chain => selectedWalletData?.supportedChains.includes(chain.id))
              .map((chain) => (
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
