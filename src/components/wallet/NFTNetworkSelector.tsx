import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface NFTNetwork {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const NFT_NETWORKS: NFTNetwork[] = [
  { id: "eth-mainnet", name: "Ethereum", icon: "⟠", color: "text-blue-500" },
  { id: "polygon-mainnet", name: "Polygon", icon: "⬡", color: "text-purple-500" },
  { id: "arb-mainnet", name: "Arbitrum", icon: "◈", color: "text-blue-400" },
  { id: "opt-mainnet", name: "Optimism", icon: "⬢", color: "text-red-500" },
  { id: "base-mainnet", name: "Base", icon: "◉", color: "text-blue-600" },
  { id: "solana-mainnet", name: "Solana", icon: "◎", color: "text-gradient-to-r from-purple-500 to-green-400" },
];

interface NFTNetworkSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const NFTNetworkSelector: React.FC<NFTNetworkSelectorProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const selectedNetwork = NFT_NETWORKS.find((n) => n.id === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-[160px] sm:w-[180px]">
        <SelectValue>
          {selectedNetwork && (
            <span className="flex items-center gap-2">
              <span className={selectedNetwork.color}>{selectedNetwork.icon}</span>
              <span className="truncate">{selectedNetwork.name}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {NFT_NETWORKS.map((network) => (
          <SelectItem key={network.id} value={network.id}>
            <span className="flex items-center gap-2">
              <span className={network.color}>{network.icon}</span>
              <span>{network.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};