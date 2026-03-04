import { LucideIcon } from "lucide-react";
import { SupportedChain } from "@/config/chains";

export interface LaunchpadStep {
    id: number;
    title: string;
    icon: LucideIcon;
    description: string;
    component?: string;
}

export type CollectionMode = "basic" | "advanced" | "1of1" | "music";

/** Describes a community-based allowlist source (e.g. NFT holders, token holders) */
export interface AllowlistCommunitySource {
    /** Human-readable label */
    label: string;
    /** 'nft_holders' | 'token_holders' | 'manual' */
    type: "nft_holders" | "token_holders" | "manual";
    /** Contract / mint / token address that qualifies wallets */
    contractAddress?: string;
    /** Minimum balance required (e.g. 1 NFT, 100 tokens) */
    minBalance?: number;
}

/** Whitelist phase configuration */
export interface WLPhaseConfig {
    /** Unique id for this WL phase */
    id: string;
    name: string;
    /** Communities whose holders qualify for this WL */
    communitySources: AllowlistCommunitySource[];
    /** Phase start (ISO string or null for manual activation) */
    startTime: string | null;
    /** Phase end (ISO string or null for open-ended) */
    endTime: string | null;
    /** Whether the WL stays open after the phase window closes */
    keepOpenAfterEnd: boolean;
    /** Max mints per wallet during this WL phase */
    maxPerWallet: number;
    /** Price during this WL phase */
    price: string;
}

/** Reveal configuration */
export interface RevealConfig {
    /** Whether this chain supports on-chain / delayed reveal */
    supported: boolean;
    /** Whether the chain supports scheduled (timed) reveal */
    supportsScheduledReveal: boolean;
    /** Whether instant reveal is available */
    supportsInstantReveal: boolean;
}

/** Team / artist credit attached to a launch */
export interface TeamMember {
    name: string;
    role: string; // e.g. "Artist", "Developer", "Community Manager"
    walletAddress?: string;
    socialLink?: string;
}

/** Per-chain treasury destination */
export interface TreasuryConfig {
    /** Primary treasury wallet that receives mint revenue */
    treasuryAddress: string;
    /** Optional split percentages to other wallets */
    splits?: {
        label: string;
        address: string;
        /** Basis points (e.g. 500 = 5%) */
        bps: number;
    }[];
}

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
        /** Reveal capabilities for this chain */
        reveal: RevealConfig;
        /** Whether this chain supports multiple community-based WL sources */
        multiCommunityWL: boolean;
        /** Whether the chain allows keeping WL open after a phase ends */
        persistentWL: boolean;
    };
    /** Default WL phase templates for this chain */
    defaultWLPhases: WLPhaseConfig[];
    /** Default team members / roles template */
    defaultTeamRoles: string[];
    /** Treasury configuration for this chain */
    treasury: TreasuryConfig;
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
