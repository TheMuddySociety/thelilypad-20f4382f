import React from "react";
import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
    size?: number;
    className?: string;
    showTooltip?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
    size = 16,
    className = "",
    showTooltip = true
}) => {
    const badge = (
        <BadgeCheck
            size={size}
            className={`text-[#00FFA3] fill-[#00FFA3]/10 ${className}`}
        />
    );

    if (!showTooltip) return badge;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {badge}
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">Verified Creator</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
