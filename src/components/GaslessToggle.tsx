import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Fuel, Sparkles, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GaslessToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function GaslessToggle({ enabled, onToggle, disabled }: GaslessToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {enabled ? <Sparkles className="w-4 h-4" /> : <Fuel className="w-4 h-4" />}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Label htmlFor="gasless-toggle" className="font-medium cursor-pointer">
              {enabled ? "Gasless Mode" : "Standard Mode"}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  {enabled ? (
                    <p className="text-xs">
                      <strong>Gasless Mode:</strong> Sign a message to mint. The platform pays gas fees for you. No MON needed for gas!
                    </p>
                  ) : (
                    <p className="text-xs">
                      <strong>Standard Mode:</strong> You pay the gas fees directly from your wallet.
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-xs text-muted-foreground">
            {enabled ? "Platform pays gas • Sign to mint" : "You pay gas • Direct transaction"}
          </span>
        </div>
      </div>
      <Switch
        id="gasless-toggle"
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}
