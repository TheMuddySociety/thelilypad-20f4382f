import React from "react";
import { Badge } from "@/components/ui/badge";
import { type RarityTier, RARITY_TIERS } from "./types";

interface RarityBadgeProps {
    tier: RarityTier;
    showLabel?: boolean;
    size?: "sm" | "default";
}

/**
 * Visual badge displaying a rarity tier with icon + label.
 */
export function RarityBadge({ tier, showLabel = true, size = "default" }: RarityBadgeProps) {
    const config = RARITY_TIERS[tier];
    const Icon = config.icon;
    const iconSize = size === "sm" ? 10 : 14;

    return (
        <Badge
            variant="outline"
            className={`${config.bgColor} ${config.borderColor} ${config.color} ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
                }`}
        >
            <Icon className={`mr-1 ${size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5"}`} />
            {showLabel && config.name}
        </Badge>
    );
}
