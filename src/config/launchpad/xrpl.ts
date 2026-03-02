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
    Image as ImageIcon,
    Database,
    Zap,
    Link
} from "lucide-react";
import { ChainLaunchpadConfig } from "./types";

export const XRPL_LAUNCHPAD_CONFIG: ChainLaunchpadConfig = {
    chain: 'xrpl',
    name: 'XRP Ledger',
    modes: {
        basic: [
            { id: 0, title: "Mode", icon: Settings, description: "Choose Mode" },
            { id: 1, title: "Essentials", icon: Tags, description: "Name, Symbol & Story" },
            { id: 2, title: "Assets", icon: FolderOpen, description: "Upload your Folder" },
            { id: 3, title: "Mint Config", icon: Sparkles, description: "Taxon & Royaties" },
            { id: 4, title: "Launch", icon: Rocket, description: "Deploy Collection" },
        ],
        advanced: [
            { id: 0, title: "Mode", icon: Settings, description: "Choose Mode" },
            { id: 1, title: "Essentials", icon: Tags, description: "Name, Symbol & Story" },
            { id: 2, title: "Layers", icon: Layers, description: "Import Trait Layers" },
            { id: 3, title: "Rarity", icon: Sparkles, description: "Configure Rarity" },
            { id: 4, title: "Generate", icon: Wand2, description: "Create Unique NFTs" },
            { id: 5, title: "Mint Config", icon: Sparkles, description: "Taxon & Royalties" },
            { id: 6, title: "Launch", icon: Rocket, description: "Deploy Collection" },
        ],
        "1of1": [
            { id: 0, title: "Essentials", icon: Tags, description: "Name & Story" },
            { id: 1, title: "Artworks", icon: Palette, description: "Upload Pieces" },
            { id: 2, title: "Editions", icon: Hash, description: "Set Editions" },
            { id: 3, title: "Mint Config", icon: Sparkles, description: "Taxon & Royalties" },
            { id: 4, title: "Launch", icon: Rocket, description: "Deploy" },
        ]
    },
    features: {
        allowlist: false, // XRPL generally doesn't have native CM-like guards for XLS-20 (mostly marketplace based)
        phases: false, // Similar to allowlist, usually handled off-chain or by marketplace
        revenueSharing: false, // XRPL Transfer Fee is limited to the single Issuer address
        customMetadata: true,
        ipfsDefault: true, // XRPL defaults to IPFS/NFT.Storage
        dynamicMetadata: false, // XRPL NFTs are immutable after minting (mostly)
    },
    tools: [
        { name: "Parallel Batch Minter", description: "Mint hundreds of NFTs simultaneously using the Ticket system.", icon: Zap, component: "ParallelMinter" },
        { name: "Deterministic Taxon", description: "Organize your collection with native XLS-20 Taxon fields.", icon: Database, component: "TaxonManager" },
        { name: "IPFS / NFT.Storage", description: "Upload your assets to decentralized storage with a single click.", icon: ImageIcon, component: "NFTStorageUploader" },
        { name: "Account Domain Link", description: "Professionally link your XRPL address to your verified project domain.", icon: Link, component: "AccountDomainLink" },
    ],
    validation: {
        maxRoyalty: 50, // XRPL max is 50% (TransferFee 50000)
        symbolMaxLength: 20, // XRPL allows more characters in some fields, but keep 20 for standard
        requireCoverImage: false, // XRPL doesn't have a formal collection cover standard on-chain (unlike SOL)
    }
};
