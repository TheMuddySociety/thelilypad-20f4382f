/**
 * XRPLNFTGenerator — Purpose-built XLS-20 NFT collection generator
 *
 * Based on the official XRPL NFT spec:
 * https://xrpl.org/docs/references/protocol/transactions/types/nftokenmint
 *
 * Fields driven from the NFTokenMint transaction:
 *  - NFTokenTaxon   (required) — collection grouping integer
 *  - TransferFee    (optional, 0-50000) — secondary sale royalty (0.000%–50.000%)
 *  - URI            (optional, ≤256 bytes hex) — metadata endpoint
 *  - Flags:
 *      tfBurnable     (0x1)  — issuer can destroy the token
 *      tfOnlyXRP      (0x2)  — token can only be traded for XRP
 *      tfTransferable (0x8)  — token can be transferred between accounts
 *      tfMutable      (0x10) — URI can be updated post-mint via NFTokenModify
 *  - Issuer         (optional) — authorized minter mints on behalf of another account
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    ArrowLeft, ArrowRight, Zap, Info, Flame, Coins, Repeat,
    PenLine, ShieldCheck, Hash, Percent, Link, User, CheckCircle2,
    AlertTriangle, Upload, ImageIcon, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWallet } from "@/providers/WalletProvider";
import { useXRPLLaunch } from "@/hooks/useXRPLLaunch";
import { supabase } from "@/integrations/supabase/client";
// storageClient removed — Arweave-only flow
import { getDbChainValue, setStoredChain } from "@/config/chains";
import { uploadBatchToArweave, BatchUploadItem } from "@/integrations/irys/client";


// ── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
    { id: "collection", label: "Collection", icon: Hash },
    { id: "flags", label: "Token Flags", icon: ShieldCheck },
    { id: "royalty", label: "Royalties", icon: Percent },
    { id: "metadata", label: "Metadata", icon: Link },
    { id: "review", label: "Review", icon: CheckCircle2 },
    { id: "upload", label: "Upload & Mint", icon: Upload },
] as const;

type StepId = typeof STEPS[number]["id"];

// ── NFTokenMint flag values ────────────────────────────────────────────────

const FLAG_BURNABLE = 0x00000001;   // 1
const FLAG_ONLY_XRP = 0x00000002;   // 2
// tfTrustLine (0x4) is DEPRECATED — we never expose it
const FLAG_TRANSFERABLE = 0x00000008;   // 8
const FLAG_MUTABLE = 0x00000010;   // 16

interface FlagConfig {
    key: "burnable" | "onlyXRP" | "transferable" | "mutable";
    flag: number;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
    recommended?: boolean;
    warning?: string;
}

const FLAG_CONFIGS: FlagConfig[] = [
    {
        key: "transferable",
        flag: FLAG_TRANSFERABLE,
        icon: Repeat,
        label: "Transferable",
        description: "Holders can transfer the NFT to other accounts. Required for secondary market sales.",
        recommended: true,
    },
    {
        key: "burnable",
        flag: FLAG_BURNABLE,
        icon: Flame,
        label: "Burnable",
        description: "The issuer can destroy this token at any time, even if held by someone else. Useful for tickets or time-limited access passes.",
    },
    {
        key: "onlyXRP",
        flag: FLAG_ONLY_XRP,
        icon: Coins,
        label: "Only XRP",
        description: "Token can only be bought or sold for XRP, not fungible tokens. Strongly recommended when a transfer fee is set.",
    },
    {
        key: "mutable",
        flag: FLAG_MUTABLE,
        icon: PenLine,
        label: "Mutable URI",
        description: "The metadata URI can be updated after mint via NFTokenModify. Useful for evolving or updatable NFTs.",
    },
];

// ── Main component ─────────────────────────────────────────────────────────

export default function XRPLNFTGenerator() {
    const navigate = useNavigate();
    const [step, setStep] = useState<StepId>("collection");

    // ── Step 1: Collection ────────────────────────────────────────
    const [collectionName, setCollectionName] = useState("");
    const [collectionSymbol, setCollectionSymbol] = useState("");
    const [description, setDescription] = useState("");
    const [totalSupply, setTotalSupply] = useState("10");
    const [taxon, setTaxon] = useState<number>(
        Math.floor(Date.now() % 1_000_000)
    );

    // ── Step 2: Flags ─────────────────────────────────────────────
    const [flags, setFlags] = useState({
        burnable: false,
        onlyXRP: true,
        transferable: true,
        mutable: false,
    });

    // ── Step 3: Royalty ───────────────────────────────────────────
    const [transferFeePercent, setTransferFeePercent] = useState(5); // 0–50 %
    // TransferFee on-chain value = percent * 1000 (0–50000)
    const transferFeeOnChain = Math.round(transferFeePercent * 1000);

    // ── Step 4: Metadata ─────────────────────────────────────────
    const [metadataBaseUri, setMetadataBaseUri] = useState("");
    const [authorizedMinter, setAuthorizedMinter] = useState("");

    // ── Computed flags integer ────────────────────────────────────
    const computedFlags = Object.entries(flags).reduce((acc, [key, enabled]) => {
        if (!enabled) return acc;
        const cfg = FLAG_CONFIGS.find((f) => f.key === key);
        return cfg ? acc | cfg.flag : acc;
    }, 0);

    // ── Validation ────────────────────────────────────────────────
    const stepErrors: Record<StepId, string[]> = {
        collection: [
            !collectionName.trim() && "Collection name is required",
            !collectionSymbol.trim() && "Symbol is required",
            (parseInt(totalSupply) < 1 || parseInt(totalSupply) > 10000) && "Supply must be 1–10,000",
        ].filter(Boolean) as string[],
        flags: [
            (!flags.transferable && transferFeePercent > 0) && "Transfer fee requires tfTransferable to be enabled",
        ].filter(Boolean) as string[],
        royalty: [
            (transferFeePercent > 50) && "XRPL max royalty is 50%",
            (transferFeePercent > 0 && !flags.onlyXRP) && "Consider enabling OnlyXRP when transfer fee is set to avoid non-XRP fee disputes",
        ].filter(Boolean) as string[],
        metadata: [],
        review: [],
        upload: [],
    };

    const currentErrors = stepErrors[step];
    const canAdvance = currentErrors.length === 0;

    const STEP_IDS = STEPS.map((s) => s.id);
    const currentIdx = STEP_IDS.indexOf(step);

    const goNext = () => {
        if (!canAdvance) {
            toast.error(currentErrors[0]);
            return;
        }
        if (currentIdx < STEP_IDS.length - 1) {
            setStep(STEP_IDS[currentIdx + 1] as StepId);
        }
    };

    const goPrev = () => {
        if (currentIdx > 0) setStep(STEP_IDS[currentIdx - 1] as StepId);
    };

    const { address, isConnected, network } = useWallet();
    const { deployXRPLCollection, mintXRPLItems, isDeploying, isMinting } = useXRPLLaunch();

    // ── Step 6: Upload state ──────────────────────────────────────
    const [files, setFiles] = useState<File[]>([]);
    const [isLaunching, setIsLaunching] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const MAX_FILE_SIZE_MB = 10;
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selected = Array.from(e.target.files);
        const oversized = selected.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
        if (oversized.length > 0) {
            toast.error(`${oversized.length} file(s) exceed ${MAX_FILE_SIZE_MB}MB and were removed.`);
        }
        setFiles(selected.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024));
    };

    const handleLaunch = async () => {
        if (!isConnected || !address) {
            toast.error("Connect your XRPL wallet first.");
            return;
        }
        if (files.length === 0) {
            toast.error("Upload at least one image file.");
            return;
        }

        setIsLaunching(true);
        setUploadProgress(5);
        let collectionId = "";

        try {
            // 1. Reserve a collection ID in Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Authentication required.");

            toast.loading("Reserving collection ID…", { id: "xrpl-gen" });
            const { data: col, error: colErr } = await supabase
                .from("collections")
                .insert({
                    name: collectionName,
                    symbol: collectionSymbol,
                    description,
                    chain: getDbChainValue("xrpl", network as "mainnet" | "testnet"),
                    total_supply: files.length,
                    status: "draft",
                    creator_id: user.id,
                    creator_address: address,
                    phases: { taxon } as any, // Store XRPL-specific config in phases JSON
                })
                .select("id")
                .single();
            if (colErr) throw colErr;
            collectionId = col.id;

            setUploadProgress(15);

            // 2. Upload images + metadata JSON to Arweave — batch-optimised
            toast.loading(`Securing ${files.length} items to Arweave…`, { id: "xrpl-gen" });

            const batchItems: BatchUploadItem[] = files.map((file, idx) => ({
                file,
                buildMetadata: (arweaveImageUri: string, thumbUri?: string, previewUri?: string) => ({
                    schema: "ipfs://bafkreibhvppn37ufanewwksp47mkbxss3lzp2azvkxo6v7ks2ip5f3kgpm",
                    nftType: "art.v0",
                    name: `${collectionName} #${idx + 1}`,
                    description,
                    image: arweaveImageUri,
                    ...(thumbUri && thumbUri !== arweaveImageUri ? { thumbnail: thumbUri } : {}),
                    ...(previewUri && previewUri !== arweaveImageUri ? { preview: previewUri } : {}),
                    attributes: [],
                    collection: { name: collectionName, family: collectionSymbol },
                    xrpl: {
                        taxon,
                        transferFee: transferFeeOnChain,
                        flags: computedFlags,
                    },
                }),
            }));

            const uploadResults = await uploadBatchToArweave(
                batchItems,
                { address, chainType: 'xrpl', network },
                (completed, total, status) => {
                    setUploadProgress(15 + Math.round((completed / total) * 40));
                    toast.loading(status, { id: "xrpl-gen" });
                },
                3, // concurrency
            );

            const itemLinks = uploadResults.map((r) => ({
                tokenID: r.tokenId.toString(),
                arweaveUri: r.arweaveUri,
                arweaveImageUri: r.arweaveImageUri,
                arweaveThumbUri: r.arweaveThumbUri,
                arweavePreviewUri: r.arweavePreviewUri,
            }));


            // 3. Deploy — sets Account Domain with baseUri
            setUploadProgress(60);
            toast.loading("Setting up XRPL collection on-chain…", { id: "xrpl-gen" });

            const primaryArweaveUri = itemLinks[0]?.arweaveUri || "";
            const result = await deployXRPLCollection({
                name: collectionName,
                symbol: collectionSymbol,
                description,
                totalSupply: files.length,
                baseUri: primaryArweaveUri,
                transferFee: transferFeeOnChain,
                flags: computedFlags,
                authorizedMinter: authorizedMinter || undefined,
                taxon, // PASS THE USER CONFIGURED TAXON
            });

            setUploadProgress(75);

            // Update DB with contract address
            const firstArweaveImage = itemLinks[0]?.arweavePreviewUri || itemLinks[0]?.arweaveImageUri || '';
            await supabase.from("collections").update({
                contract_address: result.address,
                status: "active",
                image_url: firstArweaveImage,
            }).eq("id", collectionId);

            // 4. Mint all NFTs with user-configured flags + transferFee
            setUploadProgress(80);
            toast.loading(`Minting ${files.length} NFTs on XRPL…`, { id: "xrpl-gen" });

            const items = itemLinks.map((item, i) => ({
                name: `${collectionName} #${i + 1}`,
                uri: item.arweaveUri,
            }));

            const mintResults = await mintXRPLItems(
                result.address,
                result.taxon,
                items,
                transferFeeOnChain,
                computedFlags,
                authorizedMinter || undefined,
            );

            if (!mintResults || mintResults.length === 0) {
                throw new Error("Mint returned no results — check wallet connection and XRP balance.");
            }

            // 5. Index minted NFTs with real on-chain IDs
            await supabase.from("collections").update({
                minted: mintResults.length,
                status: "minted",
            }).eq("id", collectionId);

            const { data: { session } } = await supabase.auth.getSession();
            const nftRecords = mintResults.map((res, i) => {
                const ext = files[i]?.name.split(".").pop() || "png";
                return {
                    collection_id: collectionId,
                    token_id: i,
                    nft_token_id: res.nfTokenId,
                    name: `${collectionName} #${i + 1}`,
                    description,
                    image_url: itemLinks[i]?.arweaveThumbUri || itemLinks[i]?.arweaveImageUri || '',
                    owner_address: result.address,
                    owner_id: session?.user?.id || "",
                    tx_hash: res.txHash,
                    is_revealed: true,
                    minted_at: new Date().toISOString(),
                };
            });
            await supabase.from("minted_nfts").insert(nftRecords);

            setUploadProgress(100);
            toast.success(`Minted ${mintResults.length} NFTs!`, { id: "xrpl-gen" });
            setStoredChain("xrpl");
            navigate("/launchpad");
        } catch (err: any) {
            console.error("[XRPLGen] launch error:", err);
            toast.error(err.message || "Launch failed", { id: "xrpl-gen" });
            // Clean up orphaned draft
            if (collectionId) {
                await supabase.from("collections").delete()
                    .eq("id", collectionId).eq("status", "draft");
            }
        } finally {
            setIsLaunching(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 pt-24 pb-20 max-w-3xl">

                {/* ── Page header ───────────────────────────────────── */}
                <div className="flex items-center gap-3 mb-8">
                    <button
                        onClick={() => navigate("/launchpad")}
                        className="p-2 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">XRPL NFT Generator</h1>
                            <Badge className="bg-primary/15 text-primary border-primary/30 border text-[10px]">
                                XLS-20
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Configure every NFTokenMint parameter — taxon, flags, transfer fee, and metadata URI
                        </p>
                    </div>
                </div>

                {/* ── Step progress strip ───────────────────────────── */}
                <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const isActive = s.id === step;
                        const isDone = i < currentIdx;
                        return (
                            <button
                                key={s.id}
                                onClick={() => isDone && setStep(s.id)}
                                disabled={!isDone && !isActive}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0",
                                    isActive ? "bg-primary text-primary-foreground shadow-sm" :
                                        isDone ? "bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer" :
                                            "bg-muted text-muted-foreground cursor-default"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {s.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── Step panels ───────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.18 }}
                    >

                        {/* ── Step 1: Collection ────────────────────────── */}
                        {step === "collection" && (
                            <div className="space-y-5">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Hash className="w-4 h-4 text-primary" /> Collection Identity
                                        </CardTitle>
                                        <CardDescription>Basic info about your XRPL collection</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                                <Label>Collection Name <span className="text-destructive">*</span></Label>
                                                <Input
                                                    placeholder="Lily Frogs"
                                                    value={collectionName}
                                                    onChange={(e) => setCollectionName(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Symbol <span className="text-destructive">*</span></Label>
                                                <Input
                                                    placeholder="FROG"
                                                    value={collectionSymbol}
                                                    onChange={(e) => setCollectionSymbol(e.target.value.toUpperCase().slice(0, 8))}
                                                    maxLength={8}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Description</Label>
                                            <Textarea
                                                placeholder="A collection of rare lily frogs on the XRP Ledger..."
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                rows={3}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label>Total Supply <span className="text-destructive">*</span></Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={10000}
                                                    value={totalSupply}
                                                    onChange={(e) => setTotalSupply(e.target.value)}
                                                />
                                                <p className="text-[10px] text-muted-foreground">Max 10,000 per batch</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Label>NFTokenTaxon</Label>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                                                            <TooltipContent className="max-w-xs">
                                                                A taxon groups related NFTs into a collection. Every token in this collection must share the same taxon. Auto-generated from timestamp — safe to leave as-is.
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={taxon}
                                                    onChange={(e) => setTaxon(Math.max(0, parseInt(e.target.value) || 0))}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ── Step 2: Flags ─────────────────────────────── */}
                        {step === "flags" && (
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-primary" /> NFToken Flags
                                        </CardTitle>
                                        <CardDescription>
                                            Immutable settings baked into every token at mint time — these cannot be changed later
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {FLAG_CONFIGS.map((cfg) => {
                                            const Icon = cfg.icon;
                                            const enabled = flags[cfg.key];
                                            return (
                                                <div
                                                    key={cfg.key}
                                                    className={cn(
                                                        "flex items-start gap-3 p-3.5 rounded-lg border transition-colors",
                                                        enabled ? "border-primary/40 bg-primary/5" : "border-border"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                                        enabled ? "bg-primary/15" : "bg-muted"
                                                    )}>
                                                        <Icon className={cn("w-4 h-4", enabled ? "text-primary" : "text-muted-foreground")} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-sm font-medium">{cfg.label}</p>
                                                            <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                0x{cfg.flag.toString(16).padStart(8, "0")}
                                                            </code>
                                                            {cfg.recommended && (
                                                                <Badge className="text-[9px] h-4 px-1.5 bg-green-500/15 text-green-500 border-green-500/30 border">
                                                                    Recommended
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{cfg.description}</p>
                                                        {cfg.key === "onlyXRP" && transferFeePercent > 0 && !enabled && (
                                                            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                                Recommended when transfer fee is set
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Switch
                                                        checked={enabled}
                                                        onCheckedChange={(v) => setFlags((f) => ({ ...f, [cfg.key]: v }))}
                                                        className="shrink-0 mt-0.5"
                                                    />
                                                </div>
                                            );
                                        })}

                                        <div className="mt-3 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground font-mono">
                                            Computed Flags integer: <span className="text-foreground font-semibold">{computedFlags}</span>
                                            {" "}<span className="opacity-60">(0x{computedFlags.toString(16).toUpperCase().padStart(8, "0")})</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ── Step 3: Royalty ───────────────────────────── */}
                        {step === "royalty" && (
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Percent className="w-4 h-4 text-primary" /> Transfer Fee (Royalty)
                                        </CardTitle>
                                        <CardDescription>
                                            Secondary sale royalty charged on every transfer. XRPL range: 0.000% – 50.000%
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {!flags.transferable && (
                                            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                <p className="text-xs text-amber-600 dark:text-amber-500">
                                                    <strong>tfTransferable is off</strong> — transfer fees only apply to transferable tokens. Enable the Transferable flag in Step 2 to use royalties.
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Royalty Percentage</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={50}
                                                        step={0.1}
                                                        value={transferFeePercent}
                                                        onChange={(e) => setTransferFeePercent(Math.min(50, Math.max(0, parseFloat(e.target.value) || 0)))}
                                                        className="w-20 text-right h-8 text-sm"
                                                    />
                                                    <span className="text-sm text-muted-foreground">%</span>
                                                </div>
                                            </div>
                                            <Slider
                                                min={0}
                                                max={50}
                                                step={0.5}
                                                value={[transferFeePercent]}
                                                onValueChange={([v]) => setTransferFeePercent(v)}
                                                disabled={!flags.transferable}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                                <span>0% (no royalty)</span>
                                                <span>25%</span>
                                                <span>50% (max)</span>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="p-3 bg-muted/40 rounded-lg">
                                                <p className="text-muted-foreground text-xs mb-0.5">On-chain value</p>
                                                <p className="font-mono font-semibold">TransferFee: {transferFeeOnChain}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">= {transferFeePercent}% × 1000</p>
                                            </div>
                                            <div className="p-3 bg-muted/40 rounded-lg">
                                                <p className="text-muted-foreground text-xs mb-0.5">Example on 100 XRP sale</p>
                                                <p className="font-semibold text-green-500">+{(100 * transferFeePercent / 100).toFixed(3)} XRP</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">to issuer wallet</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ── Step 4: Metadata ──────────────────────────── */}
                        {step === "metadata" && (
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Link className="w-4 h-4 text-primary" /> Metadata URI
                                        </CardTitle>
                                        <CardDescription>
                                            The URI field is hex-encoded on-chain (≤256 bytes). It points to your NFT metadata JSON.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label>Metadata Base URI</Label>
                                            <Input
                                                placeholder="https://your-project.supabase.co/storage/v1/object/public/nft-metadata/"
                                                value={metadataBaseUri}
                                                onChange={(e) => setMetadataBaseUri(e.target.value)}
                                            />
                                            <div className="bg-primary/5 rounded-lg p-6 flex gap-4 border border-primary/20">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Zap className="w-6 h-6 text-primary" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold text-lg text-primary">Arweave/Irys Permanence</h3>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        Your XRPL NFTs will be secured forever using Irys. Unlike IPFS pinning, Arweave storage is perpetual—your art stays online as long as the permaweb exists (200+ years).
                                                    </p>
                                                    <div className="flex flex-wrap gap-4 pt-2 font-mono text-[11px] opacity-70">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                            <span>Hub: arweave.net</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                            <span>Gateway: gateway.irys.xyz</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-xs text-muted-foreground">
                                                Each token's URI will be <code className="bg-muted px-1 rounded">{"{baseUri}"}{"{index}"}.json</code>.
                                                Leave blank to set the URI per-token during mint.
                                            </p>
                                        </div>

                                        {metadataBaseUri && (
                                            <div className="p-3 bg-muted/40 rounded-lg text-xs font-mono space-y-1">
                                                <p className="text-muted-foreground">Token 0 URI →</p>
                                                <p className="text-foreground break-all">{metadataBaseUri}0.json</p>
                                                <p className="text-muted-foreground mt-1">Hex-encoded (first 40 chars):</p>
                                                <p className="text-primary break-all">
                                                    {Array.from(new TextEncoder().encode(metadataBaseUri + "0.json"))
                                                        .slice(0, 20)
                                                        .map(b => b.toString(16).padStart(2, "0"))
                                                        .join("").toUpperCase()}…
                                                </p>
                                            </div>
                                        )}

                                        <Separator />

                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Label>Authorized Minter Address</Label>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            Optional. If set, this address will mint tokens on behalf of the issuer. The issuer must set NFTokenMinter on their AccountRoot to this address first.
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (optional)"
                                                    value={authorizedMinter}
                                                    onChange={(e) => setAuthorizedMinter(e.target.value)}
                                                    className="pl-9 font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ── Step 5: Review ────────────────────────────── */}
                        {step === "review" && (
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" /> NFTokenMint Summary
                                        </CardTitle>
                                        <CardDescription>
                                            Review every on-chain parameter before deploying to the XRP Ledger
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-1 font-mono text-sm bg-muted/40 rounded-lg p-4">
                                            <p className="text-muted-foreground text-xs mb-2">// NFTokenMint transaction</p>
                                            <p><span className="text-primary">TransactionType</span>: <span className="text-green-400">"NFTokenMint"</span></p>
                                            <p><span className="text-primary">NFTokenTaxon</span>: <span className="text-amber-400">{taxon}</span></p>
                                            <p><span className="text-primary">Flags</span>: <span className="text-amber-400">{computedFlags}</span>
                                                <span className="text-muted-foreground text-xs ml-2">
                          // {[
                                                        flags.transferable && "tfTransferable",
                                                        flags.burnable && "tfBurnable",
                                                        flags.onlyXRP && "tfOnlyXRP",
                                                        flags.mutable && "tfMutable",
                                                    ].filter(Boolean).join(" | ") || "none"}
                                                </span>
                                            </p>
                                            {transferFeePercent > 0 && flags.transferable && (
                                                <p><span className="text-primary">TransferFee</span>: <span className="text-amber-400">{transferFeeOnChain}</span>
                                                    <span className="text-muted-foreground text-xs ml-2">// {transferFeePercent}%</span>
                                                </p>
                                            )}
                                            {metadataBaseUri && (
                                                <p><span className="text-primary">URI</span>: <span className="text-green-400 break-all">"{metadataBaseUri + "{index}.json"}" → hex</span></p>
                                            )}
                                            {authorizedMinter && (
                                                <p><span className="text-primary">Issuer</span>: <span className="text-green-400">"{authorizedMinter}"</span></p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                        {[
                                            { label: "Collection", value: `${collectionName} (${collectionSymbol})` },
                                            { label: "Supply", value: `${parseInt(totalSupply).toLocaleString()} tokens` },
                                            { label: "Taxon", value: taxon.toString() },
                                            { label: "Royalty", value: `${transferFeePercent}% (${transferFeeOnChain})` },
                                            { label: "Flags", value: `${computedFlags} (0x${computedFlags.toString(16).toUpperCase()})` },
                                            { label: "Mutable", value: flags.mutable ? "Yes — URI updateable" : "No — URI locked at mint" },
                                        ].map(({ label, value }) => (
                                            <div key={label}>
                                                <p className="text-muted-foreground text-xs">{label}</p>
                                                <p className="font-medium truncate">{value}</p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-start gap-3">
                                    <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold">Ready to mint {parseInt(totalSupply).toLocaleString()} NFTs</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Collecting your assets and metadata is the next step. The generator will wire these parameters into every{" "}
                                            <code className="bg-muted px-1 rounded">NFTokenMint</code> transaction.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Step 6: Upload & Mint ────────────────────── */}
                        {step === "upload" && (
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Upload className="w-4 h-4 text-primary" /> Upload Assets
                                        </CardTitle>
                                        <CardDescription>
                                            Upload {parseInt(totalSupply).toLocaleString()} image files — one per NFT, in mint order.
                                            Each image is uploaded to Supabase and its metadata JSON is auto-generated.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <label
                                            htmlFor="xrpl-gen-files"
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors",
                                                files.length > 0
                                                    ? "border-primary/50 bg-primary/5"
                                                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                                            )}
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <ImageIcon className="w-6 h-6 text-primary" />
                                            </div>
                                            {files.length > 0 ? (
                                                <div className="text-center">
                                                    <p className="text-sm font-semibold">{files.length} file{files.length !== 1 ? "s" : ""} selected</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {files.map(f => f.name).slice(0, 3).join(", ")}{files.length > 3 ? ` +${files.length - 3} more` : ""}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <p className="text-sm font-medium">Click to select images</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, GIF, WEBP · Max 10MB each</p>
                                                </div>
                                            )}
                                            <input
                                                id="xrpl-gen-files"
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </label>

                                        {files.length > 0 && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">{files.length} / {totalSupply} expected</span>
                                                {files.length !== parseInt(totalSupply) && (
                                                    <span className="text-amber-500 flex items-center gap-1">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        Expected {totalSupply} files for full supply
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {isLaunching && (
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>{
                                                        uploadProgress < 15 ? "Reserving collection ID…" :
                                                            uploadProgress < 60 ? "Uploading images & metadata…" :
                                                                uploadProgress < 75 ? "Setting up XRPL collection…" :
                                                                    uploadProgress < 80 ? "Updating database…" :
                                                                        uploadProgress < 100 ? "Minting NFTs on-chain…" :
                                                                            "Done!"
                                                    }</span>
                                                    <span>{uploadProgress}%</span>
                                                </div>
                                                <Progress value={uploadProgress} className="h-1.5" />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Button
                                    onClick={handleLaunch}
                                    disabled={isLaunching || files.length === 0}
                                    className="w-full gap-2 bg-green-600 hover:bg-green-700 h-11"
                                >
                                    {isLaunching ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
                                    ) : (
                                        <><Zap className="w-4 h-4" /> Mint {files.length > 0 ? files.length : parseInt(totalSupply).toLocaleString()} NFTs on XRPL</>
                                    )}
                                </Button>
                            </div>
                        )}

                    </motion.div>
                </AnimatePresence>

                {/* ── Nav buttons ───────────────────────────────────── */}
                <div className="flex items-center justify-between mt-8 gap-3">
                    <Button
                        variant="outline"
                        onClick={goPrev}
                        disabled={currentIdx === 0}
                        className="gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>

                    {step !== "review" && step !== "upload" ? (
                        <Button onClick={goNext} disabled={!canAdvance} className="gap-2">
                            Next
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    ) : step === "review" ? (
                        <Button onClick={goNext} className="gap-2">
                            <Upload className="w-4 h-4" />
                            Upload Assets
                        </Button>
                    ) : null}
                </div>

                {/* Error hints */}
                {currentErrors.length > 0 && (
                    <div className="mt-3 space-y-1">
                        {currentErrors.map((err, i) => (
                            <p key={i} className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {err}
                            </p>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
