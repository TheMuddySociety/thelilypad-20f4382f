import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/providers/WalletProvider";
import { Wallet, LogOut, ExternalLink, User, AlertTriangle, ArrowRightLeft, Coins, ChevronDown, ChevronUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SPLTokenList } from "./SPLTokenList";
import { useSPLTokens } from "@/hooks/useSPLTokens";
import { WalletSelectorModal, WalletType, ChainType } from "./WalletSelectorModal";
import { Badge } from "@/components/ui/badge";

interface ConnectWalletProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const ConnectWallet: React.FC<ConnectWalletProps> = ({
  variant = "ghost",
  size = "sm",
  className,
}) => {
  const { 
    address, 
    isConnected, 
    isConnecting, 
    balance, 
    chainId, 
    connect, 
    disconnect, 
    currentChain, 
    switchToMonad, 
    walletType,
    chainType,
    switchChain,
    network
  } = useWallet();
  const navigate = useNavigate();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const { totalTokens } = useSPLTokens();

  const isWrongNetwork = isConnected && chainType === "evm" && chainId !== currentChain.id;

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: string | null) => {
    if (!bal) return "0.00";
    return parseFloat(bal).toFixed(4);
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDisconnectConfirm(false);
  };

  const handleWalletSelect = async (selectedWalletType: WalletType, selectedChainType: ChainType) => {
    setShowWalletSelector(false);
    await connect(selectedWalletType, selectedChainType);
  };

  const getWalletIcon = () => {
    if (walletType === "phantom") return "👻";
    if (walletType === "metamask") return "🦊";
    return null;
  };

  const getChainIcon = () => {
    if (chainType === "solana") return "◎";
    return "⟠";
  };

  const getChainName = () => {
    if (chainType === "solana") {
      return network === "mainnet" ? "Solana" : "Solana Devnet";
    }
    return currentChain.name;
  };

  const getBalanceSymbol = () => {
    if (chainType === "solana") return "SOL";
    return "MON";
  };

  const getExplorerUrl = () => {
    if (chainType === "solana") {
      const cluster = network === "mainnet" ? "" : "?cluster=devnet";
      return `https://explorer.solana.com/address/${address}${cluster}`;
    }
    return `${currentChain.blockExplorers?.default?.url}/address/${address}`;
  };

  if (!isConnected) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={() => setShowWalletSelector(true)}
          disabled={isConnecting}
        >
          <Wallet className="w-4 h-4 mr-2" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        
        <WalletSelectorModal
          open={showWalletSelector}
          onOpenChange={setShowWalletSelector}
          onSelect={handleWalletSelect}
          isConnecting={isConnecting}
        />
      </>
    );
  }

  if (isWrongNetwork) {
    return (
      <Button
        variant="destructive"
        size={size}
        className={className}
        onClick={switchToMonad}
      >
        Switch to {currentChain.name}
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={variant} size={size} className={className}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{getChainIcon()}</span>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-mono">{formatAddress(address!)}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getWalletIcon()}</span>
                <span className="text-sm font-medium">
                  {walletType === "phantom" ? "Phantom" : "MetaMask"}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {chainType === "solana" ? "Solana" : "EVM"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{formatAddress(address!)}</p>
            </div>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground">Network</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <span>{getChainIcon()}</span>
                {getChainName()}
              </p>
            </div>
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-sm font-semibold">{formatBalance(balance)} {getBalanceSymbol()}</p>
            </div>
            
            {/* SPL Token List for Solana */}
            {chainType === "solana" && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1">
                  <button
                    className="w-full flex items-center justify-between px-1 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowTokens(!showTokens);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      <span>SPL Tokens</span>
                      {totalTokens > 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {totalTokens}
                        </span>
                      )}
                    </div>
                    {showTokens ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                  {showTokens && (
                    <div className="mt-1">
                      <SPLTokenList compact maxHeight="150px" />
                    </div>
                  )}
                </div>
              </>
            )}
            <DropdownMenuSeparator />
            {walletType === "phantom" && (
              <DropdownMenuItem 
                onClick={() => switchChain(chainType === "solana" ? "evm" : "solana")}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Switch to {chainType === "solana" ? "Monad (EVM)" : "Solana"}
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={() => navigate("/wallet")}>
              <User className="w-4 h-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => window.open(getExplorerUrl(), "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Explorer
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setShowDisconnectConfirm(true)} 
              className="text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDisconnectConfirm(true)}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Disconnect wallet</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Disconnect Wallet?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to disconnect your {chainType === "solana" ? "Solana" : "EVM"} wallet{" "}
              <span className="font-mono font-medium">{formatAddress(address!)}</span>. 
              You will need to reconnect to access wallet features and make transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
