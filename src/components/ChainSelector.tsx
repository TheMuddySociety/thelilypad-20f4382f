import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { useWallet, ChainType } from "@/providers/WalletProvider";

interface ChainOption {
  id: ChainType;
  name: string;
  icon: string;
  color: string;
}

const CHAIN_OPTIONS: ChainOption[] = [
  { id: "evm", name: "Monad", icon: "⬡", color: "bg-primary/10 text-primary border-primary/30" },
  { id: "solana", name: "Solana", icon: "◎", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
];

interface ChainSelectorProps {
  selectedChain: ChainType;
  onChainChange: (chain: ChainType) => void;
  showBadge?: boolean;
  className?: string;
}

export function ChainSelector({ 
  selectedChain, 
  onChainChange, 
  showBadge = false,
  className = "" 
}: ChainSelectorProps) {
  const { chainType, isConnected } = useWallet();
  const selected = CHAIN_OPTIONS.find(c => c.id === selectedChain) || CHAIN_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`gap-2 ${className}`}>
          <span className="text-lg">{selected.icon}</span>
          <span>{selected.name}</span>
          {showBadge && isConnected && chainType === selectedChain && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-green-500/20 text-green-400">
              Connected
            </Badge>
          )}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[160px]">
        {CHAIN_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onChainChange(option.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{option.icon}</span>
              <span>{option.name}</span>
            </div>
            {selectedChain === option.id && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple badge version for display only
export function ChainBadge({ chain }: { chain: ChainType }) {
  const option = CHAIN_OPTIONS.find(c => c.id === chain) || CHAIN_OPTIONS[0];
  return (
    <Badge variant="outline" className={option.color}>
      <span className="mr-1">{option.icon}</span>
      {option.name}
    </Badge>
  );
}
