import React from "react";
import { useSPLTokens, SPLToken } from "@/hooks/useSPLTokens";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Coins, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWallet } from "@/providers/WalletProvider";

interface SPLTokenListProps {
  compact?: boolean;
  maxHeight?: string;
}

const formatBalance = (amount: string): string => {
  const num = parseFloat(amount);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.0001) return num.toFixed(4);
  return num.toExponential(2);
};

const formatMint = (mint: string): string => {
  return `${mint.slice(0, 4)}...${mint.slice(-4)}`;
};

const TokenRow: React.FC<{ token: SPLToken; compact?: boolean; network: string }> = ({ 
  token, 
  compact,
  network 
}) => {
  const explorerUrl = network === "mainnet"
    ? `https://explorer.solana.com/address/${token.mint}`
    : `https://explorer.solana.com/address/${token.mint}?cluster=devnet`;

  return (
    <div className={`flex items-center justify-between ${compact ? 'py-1.5' : 'py-2'} px-2 rounded-md hover:bg-accent/50 transition-colors`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          {token.logoURI ? (
            <img 
              src={token.logoURI} 
              alt={token.symbol || "Token"} 
              className="w-5 h-5 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Coins className="w-3 h-3 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`}>
              {token.symbol || formatMint(token.mint)}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <a 
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">View on Explorer</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {token.name && !compact && (
            <p className="text-xs text-muted-foreground truncate">{token.name}</p>
          )}
        </div>
      </div>
      <div className={`text-right ${compact ? 'text-xs' : 'text-sm'} font-mono`}>
        {formatBalance(token.uiAmount)}
      </div>
    </div>
  );
};

export const SPLTokenList: React.FC<SPLTokenListProps> = ({ 
  compact = false,
  maxHeight = "200px" 
}) => {
  const { tokens, isLoading, error, refetch, totalTokens } = useSPLTokens();
  const { network, chainType } = useWallet();

  if (chainType !== "solana") {
    return null;
  }

  if (isLoading && tokens.length === 0) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 text-center">
        <p className="text-xs text-destructive mb-2">{error}</p>
        <Button variant="ghost" size="sm" onClick={refetch}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="p-3 text-center text-muted-foreground">
        <Coins className="w-6 h-6 mx-auto mb-1 opacity-50" />
        <p className="text-xs">No SPL tokens found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-xs text-muted-foreground">
          {totalTokens} Token{totalTokens !== 1 ? 's' : ''}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5" 
          onClick={refetch}
          disabled={isLoading}
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <ScrollArea style={{ maxHeight }}>
        <div className="space-y-0.5">
          {tokens.map((token) => (
            <TokenRow 
              key={token.mint} 
              token={token} 
              compact={compact}
              network={network}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
