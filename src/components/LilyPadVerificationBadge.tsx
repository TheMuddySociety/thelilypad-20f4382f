import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Leaf, Shield, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useVerifyLilyPadCollection } from "@/hooks/useVerifyLilyPadCollection";

interface LilyPadVerificationBadgeProps {
  contractAddress: string | null | undefined;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
}

export const LilyPadVerificationBadge: React.FC<LilyPadVerificationBadgeProps> = ({
  contractAddress,
  showDetails = false,
  size = "md"
}) => {
  const { isVerified, isLoading, platformInfo } = useVerifyLilyPadCollection(contractAddress);

  // Size configurations
  const sizeConfig = {
    sm: {
      badge: "text-xs py-0.5 px-2",
      icon: "w-3 h-3",
      iconMr: "mr-1"
    },
    md: {
      badge: "text-xs py-1 px-2.5",
      icon: "w-3.5 h-3.5",
      iconMr: "mr-1.5"
    },
    lg: {
      badge: "text-sm py-1.5 px-3",
      icon: "w-4 h-4",
      iconMr: "mr-2"
    }
  };

  const config = sizeConfig[size];

  // Loading state
  if (isLoading) {
    return (
      <Badge 
        variant="outline" 
        className={`${config.badge} bg-muted/50 text-muted-foreground border-muted animate-pulse`}
      >
        <Loader2 className={`${config.icon} ${config.iconMr} animate-spin`} />
        Verifying...
      </Badge>
    );
  }

  // Not verified or no contract
  if (!contractAddress || !isVerified) {
    if (!showDetails) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`${config.badge} bg-muted/30 text-muted-foreground border-muted/50`}
            >
              <XCircle className={`${config.icon} ${config.iconMr}`} />
              Unverified
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">This collection was not deployed via LilyPad factory</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Verified badge
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`${config.badge} bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 cursor-help transition-colors`}
          >
            <Leaf className={`${config.icon} ${config.iconMr}`} />
            <Shield className={`${config.icon} ${config.iconMr}`} />
            LilyPad Verified
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Verified LilyPad Collection
            </div>
            <p className="text-xs text-muted-foreground">
              This NFT collection was deployed via the official LilyPad factory contract and includes platform identification.
            </p>
            {platformInfo && (
              <div className="pt-2 border-t border-border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span>{platformInfo.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version:</span>
                  <span>v{platformInfo.version}</span>
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
