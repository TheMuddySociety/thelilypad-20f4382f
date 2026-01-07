import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useContractAllowlist } from "@/hooks/useContractAllowlist";
import { useWallet } from "@/providers/WalletProvider";
import { getCurrencySymbol } from "@/lib/chainUtils";

interface Phase {
  id: string;
  name: string;
  price: string;
  maxPerWallet: number;
  supply: number;
  requiresAllowlist: boolean;
  isActive?: boolean;
}

interface PhaseConfigManagerProps {
  contractAddress: string;
  phases: Phase[];
  chain?: 'monad' | 'solana';
  onConfigured?: () => void;
}

export const PhaseConfigManager: React.FC<PhaseConfigManagerProps> = ({
  contractAddress,
  phases,
  chain = 'monad',
  onConfigured,
}) => {
  const { currentChain } = useWallet();
  const { isUpdating, txHash, error, configurePhase, setActivePhase, resetState } = useContractAllowlist(contractAddress);
  const [configuredPhases, setConfiguredPhases] = useState<Set<string>>(new Set());
  const [isConfiguringAll, setIsConfiguringAll] = useState(false);
  
  const currency = getCurrencySymbol(chain);
  const explorerUrl = currentChain.blockExplorers?.default?.url;

  const handleConfigurePhase = async (phase: Phase, phaseIndex: number) => {
    const result = await configurePhase(
      phaseIndex,
      phase.price,
      phase.maxPerWallet,
      phase.supply,
      phase.requiresAllowlist
    );

    if (result) {
      setConfiguredPhases(prev => new Set(prev).add(phase.id));
      toast.success(`${phase.name} phase configured on-chain!`);
      onConfigured?.();
    }
  };

  const handleSetActivePhase = async (phaseIndex: number, phaseName: string) => {
    const result = await setActivePhase(phaseIndex);
    if (result) {
      toast.success(`${phaseName} set as active phase!`);
      onConfigured?.();
    }
  };

  const handleConfigureAllPhases = async () => {
    setIsConfiguringAll(true);
    
    try {
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        toast.info(`Configuring ${phase.name}...`, { duration: 2000 });
        
        const result = await configurePhase(
          i,
          phase.price,
          phase.maxPerWallet,
          phase.supply,
          phase.requiresAllowlist
        );

        if (!result) {
          toast.error(`Failed to configure ${phase.name}`);
          setIsConfiguringAll(false);
          return;
        }

        setConfiguredPhases(prev => new Set(prev).add(phase.id));
      }

      // Set the first active phase (usually public phase with index 1, or the first phase)
      const publicPhaseIndex = phases.findIndex(p => p.id === "public");
      const activePhaseIndex = publicPhaseIndex >= 0 ? publicPhaseIndex : 0;
      
      toast.info("Setting active phase...", { duration: 2000 });
      await setActivePhase(activePhaseIndex);

      toast.success("All phases configured and activated!");
      onConfigured?.();
    } finally {
      setIsConfiguringAll(false);
    }
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-lg">Configure Phases On-Chain</CardTitle>
        </div>
        <CardDescription>
          Your contract is deployed, but phases need to be configured on-chain before minting works.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Configure All Button */}
        <Button
          onClick={handleConfigureAllPhases}
          disabled={isUpdating || isConfiguringAll}
          className="w-full gap-2"
        >
          {isConfiguringAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Configuring All Phases...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Configure All Phases (Recommended)
            </>
          )}
        </Button>

        <Separator />

        {/* Individual Phase Configuration */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Or configure individually:</p>
          
          {phases.map((phase, index) => {
            const isConfigured = configuredPhases.has(phase.id);
            
            return (
              <div
                key={phase.id}
                className={`p-3 rounded-lg border ${
                  isConfigured 
                    ? "bg-green-500/10 border-green-500/30" 
                    : "bg-muted/50 border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isConfigured ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <div>
                      <span className="font-medium">{phase.name}</span>
                      <div className="text-xs text-muted-foreground">
                        {phase.price === "0" ? "Free" : `${phase.price} ${currency}`} • 
                        Max {phase.maxPerWallet}/wallet • 
                        {phase.supply.toLocaleString()} supply
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isConfigured && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfigurePhase(phase, index)}
                        disabled={isUpdating || isConfiguringAll}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Configure"
                        )}
                      </Button>
                    )}
                    {isConfigured && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetActivePhase(index, phase.name)}
                        disabled={isUpdating || isConfiguringAll}
                      >
                        Set Active
                      </Button>
                    )}
                    {isConfigured && (
                      <Badge variant="outline" className="text-green-500 border-green-500/30">
                        Configured
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transaction Status */}
        {txHash && (
          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <a
              href={`${explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View latest transaction <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-2 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">Why is this needed?</p>
          <p>
            The smart contract needs to know the price, supply, and settings for each mint phase.
            This step writes these settings to the blockchain so minting can work correctly.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
