import { LucideIcon } from "lucide-react";
import { SupportedChain } from "@/config/chains";

export interface LaunchpadStep {
    id: number;
    title: string;
    icon: LucideIcon;
    description: string;
    component?: string; // Reference to a component name or enum if we want to decouple
}

export type CollectionMode = "basic" | "advanced" | "1of1" | "music";

export interface ChainLaunchpadConfig {
    chain: SupportedChain;
    name: string;
    modes: {
        [key in CollectionMode]?: LaunchpadStep[];
    };
    features: {
        allowlist: boolean;
        phases: boolean;
        revenueSharing: boolean;
        customMetadata: boolean;
        ipfsDefault: boolean;
        contractVerification?: boolean;
        dynamicMetadata?: boolean;
    };
    tools: {
        name: string;
        description: string;
        icon: LucideIcon;
        component: string;
    }[];
    validation: {
        maxRoyalty: number;
        symbolMaxLength: number;
        requireCoverImage: boolean;
    };
}

export const CHAIN_LAUNCHPAD_CONFIGS: Record<SupportedChain, ChainLaunchpadConfig> = {} as any; // To be populated
