import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Leaf, Shield, CheckCircle2 } from "lucide-react";

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
  // Verification logic temporarily disabled for Solana migration
  const isVerified = false;

  if (!showDetails || !isVerified) return null;

  return null;
};
