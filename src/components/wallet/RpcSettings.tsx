import React, { useState, useEffect } from "react";
import { Settings, Check, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MONAD_MAINNET_RPCS,
  MONAD_TESTNET_RPCS,
  checkRpcHealth,
  RpcHealthStatus,
  NetworkType,
} from "@/config/alchemy";
import { useWallet } from "@/providers/WalletProvider";

const RPC_LABELS: Record<string, string> = {
  "https://rpc1.monad.xyz": "Alchemy (Primary)",
  "https://rpc.monad.xyz": "QuickNode",
  "https://rpc3.monad.xyz": "Ankr",
  "https://monad.drpc.org": "dRPC",
  "https://testnet-rpc.monad.xyz": "Monad Testnet (Primary)",
  "https://rpc.ankr.com/monad_testnet": "Ankr Testnet",
};

export const getPreferredRpc = (network: NetworkType): string | null => {
  return localStorage.getItem(`preferredRpc_${network}`);
};

export const setPreferredRpc = (network: NetworkType, rpcUrl: string | null): void => {
  if (rpcUrl) {
    localStorage.setItem(`preferredRpc_${network}`, rpcUrl);
  } else {
    localStorage.removeItem(`preferredRpc_${network}`);
  }
};

interface RpcSettingsProps {
  variant?: "icon" | "button";
  size?: "sm" | "default";
}

export const RpcSettings: React.FC<RpcSettingsProps> = ({ 
  variant = "icon",
  size = "default" 
}) => {
  const { network } = useWallet();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedRpc, setSelectedRpc] = useState<string>("auto");
  const [healthStatuses, setHealthStatuses] = useState<Record<string, RpcHealthStatus>>({});
  const [isChecking, setIsChecking] = useState(false);

  const rpcs = network === "mainnet" ? MONAD_MAINNET_RPCS : MONAD_TESTNET_RPCS;

  useEffect(() => {
    const saved = getPreferredRpc(network);
    setSelectedRpc(saved || "auto");
  }, [network, open]);

  const checkHealth = async () => {
    setIsChecking(true);
    const statuses: Record<string, RpcHealthStatus> = {};
    
    await Promise.all(
      rpcs.map(async (rpc) => {
        const status = await checkRpcHealth(rpc);
        statuses[rpc] = status;
      })
    );
    
    setHealthStatuses(statuses);
    setIsChecking(false);
  };

  useEffect(() => {
    if (open) {
      checkHealth();
    }
  }, [open, network]);

  const handleSave = () => {
    const rpcToSave = selectedRpc === "auto" ? null : selectedRpc;
    setPreferredRpc(network, rpcToSave);
    
    toast({
      title: "RPC Preference Saved",
      description: selectedRpc === "auto" 
        ? "Using automatic RPC selection with failover" 
        : `Using ${RPC_LABELS[selectedRpc] || selectedRpc}`,
    });
    
    setOpen(false);
    
    // Trigger page reload to apply new RPC settings
    window.location.reload();
  };

  const getLatencyBadge = (status?: RpcHealthStatus) => {
    if (!status) return null;
    
    if (!status.healthy) {
      return (
        <Badge variant="destructive" className="text-xs">
          <WifiOff className="w-3 h-3 mr-1" />
          Offline
        </Badge>
      );
    }
    
    const latency = status.latency || 0;
    const color = latency < 200 ? "bg-green-500/20 text-green-400" 
                : latency < 500 ? "bg-yellow-500/20 text-yellow-400" 
                : "bg-orange-500/20 text-orange-400";
    
    return (
      <Badge className={`text-xs ${color}`}>
        <Wifi className="w-3 h-3 mr-1" />
        {latency}ms
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size={size}>
            <Settings className="h-4 w-4 mr-2" />
            RPC Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle>RPC Endpoint Settings</DialogTitle>
          <DialogDescription>
            Select your preferred RPC endpoint for {network === "mainnet" ? "Monad Mainnet" : "Monad Testnet"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {isChecking ? "Checking endpoints..." : "Endpoint health"}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={checkHealth}
              disabled={isChecking}
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>

          <RadioGroup value={selectedRpc} onValueChange={setSelectedRpc}>
            {/* Auto option */}
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Automatic</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Auto-select fastest healthy endpoint
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Recommended
                  </Badge>
                </div>
              </Label>
            </div>

            {/* Individual RPC options */}
            {rpcs.map((rpc) => {
              const status = healthStatuses[rpc];
              const label = RPC_LABELS[rpc] || new URL(rpc).hostname;
              
              return (
                <div 
                  key={rpc}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <RadioGroupItem value={rpc} id={rpc} />
                  <Label htmlFor={rpc} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{label}</span>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                          {rpc}
                        </p>
                      </div>
                      {isChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        getLatencyBadge(status)
                      )}
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
