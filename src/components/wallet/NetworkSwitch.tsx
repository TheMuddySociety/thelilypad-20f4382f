import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/providers/WalletProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, Globe, Droplets, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TESTNET_FAUCET_URL = "https://faucet.monad.xyz";

export const NetworkSwitch: React.FC = () => {
  const { network, switchNetwork, isConnected } = useWallet();
  const [isSwitching, setIsSwitching] = useState(false);

  const isTestnet = network === "testnet";

  const handleNetworkSwitch = async (checked: boolean) => {
    const newNetwork = checked ? "testnet" : "mainnet";
    
    setIsSwitching(true);
    try {
      await switchNetwork(newNetwork);
      toast.success(`Switched to ${newNetwork === "testnet" ? "Testnet" : "Mainnet"}`);
    } catch (error: any) {
      console.error("Network switch error:", error);
      toast.error(`Failed to switch network: ${error?.message || "Unknown error"}`);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {isSwitching ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : isTestnet ? (
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
        onCheckedChange={handleNetworkSwitch}
        disabled={isSwitching}
        aria-label="Toggle network"
      />
      {isTestnet && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
          onClick={() => window.open(TESTNET_FAUCET_URL, "_blank")}
        >
          <Droplets className="w-3 h-3 mr-1" />
          Faucet
        </Button>
      )}
    </div>
  );
};
