import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
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
  chain?: 'monad' | 'solana' | string;
  onConfigured?: () => void;
}

export const PhaseConfigManager: React.FC<PhaseConfigManagerProps> = ({
  contractAddress,
  phases,
  chain = 'solana',
  onConfigured,
}) => {
  const [configuredPhases, setConfiguredPhases] = useState<Set<string>>(new Set());
  const [isConfiguringAll, setIsConfiguringAll] = useState(false);

  const currency = getCurrencySymbol(chain);
  // Simplified: Always treat as Solana or fallback to default behavior which is now Solana-centric
  const isSolana = true;

  const handleConfigureAllPhases = async () => {
    // For Solana, phases are configured via Candy Machine guards
    toast.info("Phases are configured through Candy Machine guards on Solana.");
    setConfiguredPhases(new Set(phases.map(p => p.id)));
    onConfigured?.();
  };

  const handleSetActivePhase = async (phaseIndex: number, phaseName: string) => {
    toast.info(`${phaseName} phase timing is controlled by Candy Machine guards.`);
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-lg">Phase Configuration</CardTitle>
        </div>
        <CardDescription>
          "Phases are managed via Candy Machine guards on Solana"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info for Solana */}
        <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <Info className="w-4 h-4 mt-0.5 text-primary" />
          <div className="text-sm">
            <p className="font-medium">Candy Machine Phases</p>
            <p className="text-muted-foreground text-xs mt-1">
              On Solana, mint phases (allowlist, public sale, etc.) are controlled by Candy Machine guard settings
              including start/end dates, allowlists, and pricing.
            </p>
          </div>
        </div>


        {/* Phase List */}
        <div className="space-y-2">
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {configuredPhases.has(phase.id) ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{phase.name}</span>
                    {phase.isActive && (
                      <Badge className="text-xs">Active</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {phase.price === "0" ? "Free" : `${phase.price} ${currency}`} •
                    Max {phase.maxPerWallet}/wallet •
                    {phase.supply} supply
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Configure All Button */}
      </CardContent>
    </Card>
  );
};

export default PhaseConfigManager;
