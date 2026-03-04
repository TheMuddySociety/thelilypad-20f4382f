import {
    Settings,
    Tags,
    FolderOpen,
    Sparkles,
    Rocket,
    Layers,
    Wand2,
    Palette,
    Hash,
    Shield,
    Clock,
    Wallet
} from "lucide-react";
import { ChainLaunchpadConfig } from "./types";

export const SOLANA_LAUNCHPAD_CONFIG: ChainLaunchpadConfig = {
    chain: 'solana',
    name: 'Solana',
    modes: {
        basic: [
            { id: 0, title: "Mode", icon: Settings, description: "Choose Mode" },
            { id: 1, title: "Essentials", icon: Tags, description: "Name, Symbol & Story" },
            { id: 2, title: "Assets", icon: FolderOpen, description: "Upload your Folder" },
            { id: 3, title: "Mint Config", icon: Sparkles, description: "Pricing & Guards" },
            { id: 4, title: "Launch", icon: Rocket, description: "Deploy Collection" },
        ],
        advanced: [
            { id: 0, title: "Mode", icon: Settings, description: "Choose Mode" },
            { id: 1, title: "Essentials", icon: Tags, description: "Name, Symbol & Story" },
            { id: 2, title: "Layers", icon: Layers, description: "Import Trait Layers" },
            { id: 3, title: "Rarity", icon: Sparkles, description: "Configure Rarity" },
            { id: 4, title: "Generate", icon: Wand2, description: "Create Unique NFTs" },
            { id: 5, title: "Mint Config", icon: Sparkles, description: "Pricing & Guards" },
            { id: 6, title: "Launch", icon: Rocket, description: "Deploy Collection" },
        ],
        "1of1": [
            { id: 0, title: "Essentials", icon: Tags, description: "Name & Story" },
            { id: 1, title: "Artworks", icon: Palette, description: "Upload Pieces" },
            { id: 2, title: "Editions", icon: Hash, description: "Set Editions" },
            { id: 3, title: "Mint Config", icon: Sparkles, description: "Pricing & Guards" },
            { id: 4, title: "Launch", icon: Rocket, description: "Deploy" },
        ]
    },
    features: {
        allowlist: true,
        phases: true,
        revenueSharing: true,
        customMetadata: true,
        ipfsDefault: false, // Solana defaults to Irys/Arweave
        reveal: {
            supported: true,
            supportsScheduledReveal: true,
            supportsInstantReveal: true,
        },
        multiCommunityWL: true, // Can WL multiple NFT/token holder communities
        persistentWL: false, // Candy Guard phases are strict time-bound
    },
    defaultWLPhases: [
        {
            id: "og",
            name: "OG Allowlist",
            communitySources: [],
            startTime: null,
            endTime: null,
            keepOpenAfterEnd: false,
            maxPerWallet: 2,
            price: "0",
        },
        {
            id: "wl",
            name: "Whitelist",
            communitySources: [],
            startTime: null,
            endTime: null,
            keepOpenAfterEnd: false,
            maxPerWallet: 3,
            price: "0",
        },
    ],
    defaultTeamRoles: ["Artist", "Developer", "Community Manager", "Founder"],
    treasury: {
        treasuryAddress: "",
        splits: [
            { label: "Creator", address: "", bps: 8500 },
            { label: "Platform", address: "2cS7yyypbtxQ4qBdZRYtXDEDTQJZK34h4RPmXxz4sKHk", bps: 1500 },
        ],
    },
    tools: [
        { name: "Candy Machine V3", description: "Set up phases, mint guards, and launch dates.", icon: Shield, component: "CandyMachineManager" },
        { name: "Metaplex Core", description: "Minimalistic and fast NFT standard for the next generation.", icon: Rocket, component: "MetaplexCoreSetup" },
        { name: "Freeze Authority", description: "Manage the ability to freeze minted NFTs until launch.", icon: Clock, component: "FreezeGuard" },
        { name: "Treasury Split", description: "Automatically share revenue with multiple creators.", icon: Wallet, component: "RevenueShare" },
    ],
    validation: {
        maxRoyalty: 100,
        symbolMaxLength: 10,
        requireCoverImage: true,
    }
};
