import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp } from "lucide-react";

interface BuybackProgramBadgeProps {
  className?: string;
}

export function BuybackProgramBadge({ className }: BuybackProgramBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={`bg-gradient-to-r from-primary/20 to-green-500/20 text-primary border-primary/30 gap-1 ${className}`}
          >
            <TrendingUp className="w-3 h-3" />
            Buyback
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-[200px] text-center">
            This collection is part of The Lily Pad Buyback Program. 
            Top volume movers receive rewards!
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
