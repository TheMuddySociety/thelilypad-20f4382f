import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/providers/WalletProvider";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Globe } from "lucide-react";

export const NetworkSwitch: React.FC = () => {
  const { network, switchNetwork, isConnected } = useWallet();

  const isTestnet = network === "testnet";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {isTestnet ? (
          <FlaskConical className="w-4 h-4 text-amber-500" />
        ) : (
          <Globe className="w-4 h-4 text-primary" />
        )}
        <Badge 
          variant={isTestnet ? "outline" : "default"}
          className={isTestnet ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : ""}
        >
          {isTestnet ? "Testnet" : "Mainnet"}
        </Badge>
      </div>
      <Switch
        checked={isTestnet}
        onCheckedChange={(checked) => switchNetwork(checked ? "testnet" : "mainnet")}
        disabled={isConnected}
        aria-label="Toggle network"
      />
      {isConnected && (
        <span className="text-xs text-muted-foreground">
          Disconnect to switch
        </span>
      )}
    </div>
  );
};
