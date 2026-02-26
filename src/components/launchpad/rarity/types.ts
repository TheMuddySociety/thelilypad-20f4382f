import { Crown, Gem, Star, Circle, type LucideIcon } from "lucide-react";

// ── Rarity Tier Definitions ────────────────────────────────────────────────

export type RarityTier = "legendary" | "rare" | "uncommon" | "common";

export interface RarityTierConfig {
    name: string;
    maxPercentage: number;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: LucideIcon;
}

export const RARITY_TIERS: Record<RarityTier, RarityTierConfig> = {
    legendary: {
        name: "Legendary",
        maxPercentage: 5,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/50",
        icon: Crown,
    },
    rare: {
        name: "Rare",
        maxPercentage: 15,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/50",
        icon: Gem,
    },
    uncommon: {
        name: "Uncommon",
        maxPercentage: 35,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/50",
        icon: Star,
    },
    common: {
        name: "Common",
        maxPercentage: 100,
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
        borderColor: "border-muted",
        icon: Circle,
    },
};

/**
 * Determine the rarity tier from an occurrence percentage.
 * Lower percentage = rarer.
 */
export function getRarityTier(percentage: number): RarityTier {
    if (percentage <= RARITY_TIERS.legendary.maxPercentage) return "legendary";
    if (percentage <= RARITY_TIERS.rare.maxPercentage) return "rare";
    if (percentage <= RARITY_TIERS.uncommon.maxPercentage) return "uncommon";
    return "common";
}

// ── Rarity Report ──────────────────────────────────────────────────────────

export interface RarityReport {
    totalGenerated: number;
    layerDistributions: {
        layerName: string;
        traits: {
            traitName: string;
            count: number;
            percentage: number;
            expectedPercentage: number;
            tier: RarityTier;
        }[];
    }[];
    rarestCombinations: {
        nftId: number;
        rarityScore: number;
        traits: string[];
        overallTier: RarityTier;
    }[];
    tierSummary: {
        tier: RarityTier;
        traitCount: number;
        nftCount: number;
    }[];
}
