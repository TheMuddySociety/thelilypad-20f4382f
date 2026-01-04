import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/providers/WalletProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, Globe, Droplets, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TESTNET_FAUCET_URL = "https://faucet.monad.xyz";

// Lock app to testnet only
const TESTNET_LOCKED = true;

export const NetworkSwitch: React.FC = () => {
  const { network, switchNetwork, isConnected } = useWallet();

  // Force testnet on mount if locked
  React.useEffect(() => {
    if (TESTNET_LOCKED && network !== "testnet") {
      switchNetwork("testnet");
    }
  }, [network, switchNetwork]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <FlaskConical className="w-4 h-4 text-amber-500" />
        <Badge 
          variant="outline"
          className="bg-amber-500/10 text-amber-500 border-amber-500/30"
        >
          Testnet Only
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
        onClick={() => window.open(TESTNET_FAUCET_URL, "_blank")}
      >
        <Droplets className="w-3 h-3 mr-1" />
        Faucet
      </Button>
    </div>
  );
};
