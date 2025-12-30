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
import { WalletSelectorModal, WalletType, ChainType, OAuthProvider } from "./WalletSelectorModal";
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
    connectWithOAuth,
    disconnect, 
    currentChain, 
    switchToMonad, 
    walletType,
    chainType,
    switchChain,
    network,
    authProvider
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

  const handleOAuthSelect = async (provider: OAuthProvider, selectedChainType: ChainType) => {
    setShowWalletSelector(false);
    await connectWithOAuth(provider, selectedChainType);
  };

  const getWalletIcon = () => {
    // Check if connected via OAuth
    if (authProvider === "google") return (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    );
    if (authProvider === "apple") return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    );
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
          onOAuthSelect={handleOAuthSelect}
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
                <span className="text-lg flex-shrink-0">{getWalletIcon()}</span>
                <span className="text-sm font-medium">
                  {authProvider === "google" ? "Google" : 
                   authProvider === "apple" ? "Apple" : 
                   walletType === "phantom" ? "Phantom" : "MetaMask"}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {chainType === "solana" ? "Solana" : "EVM"}
                </Badge>
                {(authProvider === "google" || authProvider === "apple") && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Embedded
                  </Badge>
                )}
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
