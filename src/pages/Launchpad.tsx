import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Rocket, Clock, CheckCircle, Sparkles, Loader2, FileEdit, Trash2,
  Image as ImageIcon, LayoutGrid, Check, Pencil, Lock, AlertCircle, ArrowRight,
  Layers, Zap, Globe, ChevronRight, Palette, Music, BarChart3, ShoppingCart,
  Star, TrendingUp, Repeat,
} from "lucide-react";
import { HomepageFeaturedCollections } from "@/components/sections/HomepageFeaturedCollections";
import { RecentSalesTable } from "@/components/launchpad/RecentSalesTable";
import { BuybackProgramBadge } from "@/components/BuybackProgramBadge";
import { CreateCollectionModal } from "@/components/launchpad/CreateCollectionModal";
import { ChainIcon } from "@/components/launchpad/ChainSelector";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import lilypadLogo from "@/assets/lilypad-logo.png";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useSEO } from "@/hooks/useSEO";
import { useLaunchpadData, getCollectionPrice, getCollectionProgress, getHealthStatus, getStepLabel, getPhaseNames } from "@/hooks/useLaunchpadData";
import { useLaunchpadStats } from "@/hooks/useLaunchpadStats";
import { useBuybackProgram } from "@/hooks/useBuybackProgram";
import { SupportedChain, CHAINS, getStoredChain, setStoredChain } from "@/config/chains";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Status helpers ────────────────────────────────────────────────────────────
const statusColors = {
  live: "bg-green-500/20 text-green-400 border-green-500/30",
  upcoming: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ended: "bg-muted text-muted-foreground border-border",
};
const statusIcons = { live: Sparkles, upcoming: Clock, ended: CheckCircle };

// ── Chain definitions shown in the sidebar ───────────────────────────────────
interface ChainEntry {
  id: SupportedChain;
  label: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
}

const CHAIN_ENTRIES: ChainEntry[] = [
  { id: "solana", label: "Solana", description: "Metaplex Core & Candy Machine", badge: "Live", badgeVariant: "default" },
  { id: "xrpl", label: "XRPL", description: "XLS-20 NFT Standard", badge: "Live", badgeVariant: "default" },
  { id: "monad", label: "Monad", description: "EVM-Compatible Layer 1", badge: "Live", badgeVariant: "default" },
];

// ── Collection type tiles ─────────────────────────────────────────────────────
interface CollectionTypeTile {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
  highlight?: boolean;
  xrplDefault?: boolean;
  chains: SupportedChain[];
}

const COLLECTION_TYPES: CollectionTypeTile[] = [
  {
    id: "generative",
    title: "Generative Art",
    description: "Layer-based procedural generation. Upload trait layers and generate thousands of unique combinations with custom rarity weights.",
    icon: Layers,
    highlight: true,
    chains: ["solana", "xrpl", "monad"],
    tag: "Most Popular",
  },
  {
    id: "music",
    title: "Music NFTs",
    description: "Audio tracks with artwork, rich metadata, and streaming capabilities. FLAC, MP3, and WAV supported.",
    icon: Music,
    chains: ["solana", "monad"],
  },
  {
    id: "xrpl-589",
    title: "XRPL Collection · 589 Supply",
    description: "XLS-20 ready collection built for XRPL. Default 589 supply at 4000×4000px. Export includes XLS-20 metadata ZIP.",
    icon: Star,
    highlight: true,
    xrplDefault: true,
    chains: ["xrpl"],
    tag: "XRPL Native",
  },
  {
    id: "1of1",
    title: "1/1 & Limited Editions",
    description: "Hand-crafted one-of-a-kind pieces or small numbered editions. Perfect for collectors and gallery drops.",
    icon: Palette,
    chains: ["solana", "xrpl", "monad"],
  },
  {
    id: "hybrid-404",
    title: "MPL-404 Hybrid",
    description: "Swap between fungible tokens and NFTs. Build an escrow that lets holders capture NFTs with tokens and release them back.",
    icon: Repeat,
    highlight: true,
    chains: ["solana"],
    tag: "New",
  },
];

// ── Filter tabs ───────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "live", label: "Live", icon: Sparkles },
  { value: "upcoming", label: "Upcoming", icon: Clock },
  { value: "ended", label: "Ended", icon: CheckCircle },
  { value: "drafts", label: "Drafts", icon: FileEdit },
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function Launchpad() {
  const navigate = useNavigate();
  const { network, isConnected } = useWallet();

  const [selectedChain, setSelectedChain] = useState<SupportedChain>(getStoredChain);
  const currentChain = CHAINS[selectedChain];
  const isTestnet = network === "testnet";

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDefaultStandard, setCreateModalDefaultStandard] = useState<any>("core");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);

  const {
    collections, isLoading, draft, loadDraft, deleteDraft,
    currentUserId, deleteCollection, isDeleting, restoreCollection,
    getFilteredCollections, refetch,
  } = useLaunchpadData(selectedChain);

  const { stats, isLoading: statsLoading } = useLaunchpadStats();
  const { isInProgram } = useBuybackProgram();

  useSEO({
    title: `NFT Launchpad – ${currentChain.name} | The Lily Pad`,
    description: `Launch your NFT collection on ${currentChain.name}. Create generative art, set mint phases, manage allowlists, and deploy.`,
  });

  const handleChainChange = (chain: SupportedChain) => {
    setStoredChain(chain);
    setSelectedChain(chain);
  };

  const handleDeleteCollection = (collectionId: string) => {
    deleteCollection(collectionId);
    setDeleteCollectionId(null);
  };

  const continueDraft = () => {
    setEditingDraft(true);
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    if (!isCreateModalOpen) {
      loadDraft();
      setEditingDraft(false);
      setCreateModalDefaultStandard("core");
    }
  }, [isCreateModalOpen, loadDraft]);

  const filteredCollections = getFilteredCollections(activeTab);

  const getProgress = (step: number) => Math.round(((step + 1) / 5) * 100);

  // Tiles for the selected chain
  const chainTiles = COLLECTION_TYPES.filter((t) => t.chains.includes(selectedChain));

  const handleTileClick = (tile: CollectionTypeTile) => {
    if (selectedChain === "monad") return; // soon
    if (tile.id === "hybrid-404") {
      setCreateModalDefaultStandard("hybrid-404");
    } else {
      setCreateModalDefaultStandard(tile.xrplDefault ? "xrpl-589" : tile.id === "music" ? "music" : "core");
    }
    setIsCreateModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <CreateCollectionModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        selectedChain={selectedChain}
        onCollectionCreated={() => {
          loadDraft();
          refetch();
          setIsCreateModalOpen(false);
          toast.success("Collection created successfully!");
        }}
        defaultStandard={createModalDefaultStandard}
      />

      <main className="container mx-auto px-4 pt-24 pb-16">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-10">
          <img src={lilypadLogo} alt="Lily Launchpad" className="w-14 h-14 rounded-xl object-contain bg-primary/10 p-2" />
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Lily Launchpad</h1>
            <p className="text-muted-foreground mt-0.5">Launch your NFT collection on Solana or XRPL — guided wizard, no friction.</p>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Collections", value: statsLoading ? null : stats.totalCollections.toLocaleString(), icon: LayoutGrid },
            { label: "Live Now", value: statsLoading ? null : stats.liveNow.toString(), icon: Sparkles, pulse: stats.liveNow > 0 },
            { label: "NFTs Minted", value: statsLoading ? null : stats.nftsMinted >= 1000 ? `${(stats.nftsMinted / 1000).toFixed(1)}K` : stats.nftsMinted.toLocaleString(), icon: TrendingUp },
            { label: "Total Volume", value: statsLoading ? null : `${stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}K` : stats.totalVolume} SOL`, icon: BarChart3 },
          ].map(({ label, value, icon: Icon, pulse }) => (
            <Card key={label} className="border-border/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {pulse && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                </div>
                {value === null ? (
                  <Skeleton className="h-7 w-20 mb-1" />
                ) : (
                  <div className="text-2xl font-bold">{value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main two-column layout ─────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sidebar: Chain selector ─────────────────────────────────── */}
          <aside className="lg:w-56 shrink-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-3">Blockchain</p>
            {CHAIN_ENTRIES.map((entry) => {
              const active = selectedChain === entry.id;
              const disabled = entry.id === "monad";
              return (
                <button
                  key={entry.id}
                  disabled={disabled}
                  onClick={() => !disabled && handleChainChange(entry.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg border text-left transition-all duration-150",
                    active
                      ? "border-primary/60 bg-primary/8 shadow-sm"
                      : "border-border hover:border-border/80 hover:bg-muted/50",
                    disabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <ChainIcon chain={entry.id} className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", active && "text-primary")}>{entry.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">{entry.description}</p>
                  </div>
                  {entry.badge && (
                    <Badge
                      variant={entry.badgeVariant}
                      className={cn("text-[9px] h-4 px-1.5 shrink-0",
                        entry.badgeVariant === "default" && "bg-primary/20 text-primary border-primary/30 border"
                      )}
                    >
                      {entry.badge}
                    </Badge>
                  )}
                </button>
              );
            })}

            <div className="pt-4 border-t border-border/40">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-3">Quick Links</p>
              <button onClick={() => navigate("/marketplace")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                <ShoppingCart className="w-4 h-4" />
                Marketplace
              </button>
              <button onClick={() => navigate("/ready-trade")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                <TrendingUp className="w-4 h-4" />
                Ready Trade
              </button>
            </div>
          </aside>

          {/* ── Right panel ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-10">

            {/* ── Chain header + Create button ───────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ChainIcon chain={selectedChain} className="w-7 h-7" />
                <div>
                  <h2 className="text-xl font-bold">{currentChain.name}</h2>
                  <p className="text-xs text-muted-foreground">{isTestnet ? "Testnet Mode" : "Mainnet"}</p>
                </div>
              </div>
              <Button
                size="default"
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Collection
              </Button>
            </div>

            {/* ── Collection type tiles ──────────────────────────────────── */}
            <AnimatePresence mode="wait">
              <motion.section
                key={selectedChain}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Collection Types</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {chainTiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                      <button
                        key={tile.id}
                        onClick={() => handleTileClick(tile)}
                        className={cn(
                          "group relative text-left p-5 rounded-xl border transition-all duration-150",
                          tile.highlight
                            ? "border-primary/40 bg-primary/5 hover:border-primary/70 hover:bg-primary/8"
                            : "border-border hover:border-border/80 hover:bg-muted/40"
                        )}
                      >
                        {tile.tag && (
                          <Badge className="absolute top-3 right-3 text-[9px] h-4 px-1.5 bg-primary/15 text-primary border-primary/30 border">
                            {tile.tag}
                          </Badge>
                        )}
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center mb-3",
                          tile.highlight ? "bg-primary/15" : "bg-muted"
                        )}>
                          <Icon className={cn("w-5 h-5", tile.highlight ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <p className="font-semibold text-sm mb-1">{tile.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tile.description}</p>
                        <div className={cn(
                          "flex items-center gap-1 mt-3 text-xs font-medium transition-colors",
                          tile.highlight ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          <span>Start Building</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.section>
            </AnimatePresence>

            {/* ── Draft resume banner ────────────────────────────────────── */}
            {draft && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-4">
                  {draft.imageUrl
                    ? <img src={draft.imageUrl} alt="Draft" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    : <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0"><ImageIcon className="w-5 h-5 text-primary" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{draft.name || "Untitled Draft"}</p>
                    <p className="text-xs text-muted-foreground">Saved {formatDistanceToNow(new Date(draft.savedAt), { addSuffix: true })} · Step {draft.currentStep + 1} of 5</p>
                    <div className="w-full bg-muted rounded-full h-1 mt-2">
                      <div className="bg-primary h-1 rounded-full" style={{ width: `${getProgress(draft.currentStep)}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={continueDraft} className="gap-1.5">
                      <FileEdit className="w-3.5 h-3.5" />
                      Resume
                    </Button>
                    <Button size="sm" variant="ghost" onClick={deleteDraft} className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Featured collections ────────────────────────────────────── */}
            <section>
              <HomepageFeaturedCollections />
            </section>

            {/* ── Recent Sales ───────────────────────────────────────────── */}
            <section>
              <RecentSalesTable />
            </section>

            {/* ── Collections list ───────────────────────────────────────── */}
            <section>
              {/* Filter tabs */}
              <div className="flex items-center gap-1 mb-5 flex-wrap">
                {FILTER_TABS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setActiveTab(value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      activeTab === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    {value === "drafts" && draft && (
                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">1</Badge>
                    )}
                  </button>
                ))}
              </div>

              {/* Drafts tab */}
              {activeTab === "drafts" && !draft && (
                <div className="text-center py-16 border border-dashed rounded-xl">
                  <FileEdit className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium mb-1">No drafts saved</p>
                  <p className="text-sm text-muted-foreground">Start a collection and your progress will auto-save here.</p>
                </div>
              )}

              {/* Collection grid */}
              {activeTab !== "drafts" && (
                isLoading
                  ? <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
                  : filteredCollections.length === 0
                    ? (
                      <div className="text-center py-16 border border-dashed rounded-xl">
                        <Rocket className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="font-medium mb-1">No collections yet</p>
                        <p className="text-sm text-muted-foreground mb-5">Be the first to launch!</p>
                        <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
                          <Plus className="w-4 h-4 mr-1.5" />
                          Create Collection
                        </Button>
                      </div>
                    )
                    : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredCollections.map((collection) => {
                          const StatusIcon = statusIcons[collection.status as keyof typeof statusIcons] ?? Sparkles;
                          const isOwner = !!(currentUserId && collection.creator_id === currentUserId);
                          const isDeployed = !!collection.contract_address;
                          const canEdit = isOwner && !isDeployed;
                          const progress = getCollectionProgress(collection);
                          const health = getHealthStatus(collection);

                          return (
                            <Card
                              key={collection.id}
                              className={cn(
                                "overflow-hidden hover:border-primary/40 transition-all cursor-pointer group",
                                canEdit && "border-primary/20"
                              )}
                              onClick={() => navigate(`/launchpad/${collection.id}`)}
                            >
                              <div className="aspect-square relative overflow-hidden bg-muted">
                                {collection.image_url
                                  ? <img src={collection.image_url} alt={collection.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  : <div className="w-full h-full flex items-center justify-center"><Rocket className="w-10 h-10 text-muted-foreground" /></div>
                                }
                                {/* Badges overlay */}
                                <div className="absolute top-2.5 right-2.5 flex gap-1.5 flex-wrap justify-end">
                                  <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-md border-white/10 h-5 text-[10px]">
                                    <ChainIcon chain={selectedChain} className="w-2.5 h-2.5 mr-1" />
                                    {currentChain.symbol}
                                  </Badge>
                                  {canEdit && (
                                    <>
                                      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 h-5 text-[10px]">
                                        <Pencil className="w-2.5 h-2.5 mr-1" />
                                        Draft
                                      </Badge>
                                      <button
                                        className="h-5 w-5 flex items-center justify-center rounded bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/40 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); setDeleteCollectionId(collection.id); }}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </>
                                  )}
                                  {isOwner && isDeployed && (
                                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 h-5 text-[10px]">
                                      <Lock className="w-2.5 h-2.5 mr-1" />
                                      Deployed
                                    </Badge>
                                  )}
                                </div>
                                <Badge variant="outline" className={`absolute top-2.5 left-2.5 h-5 text-[10px] ${statusColors[collection.status as keyof typeof statusColors]}`}>
                                  <StatusIcon className="w-2.5 h-2.5 mr-1" />
                                  {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
                                </Badge>
                              </div>

                              <CardHeader className="pb-2 pt-4 px-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <CardTitle className="text-base leading-tight">{collection.name}</CardTitle>
                                      {isInProgram(collection.id) && <BuybackProgramBadge />}
                                    </div>
                                    <CardDescription className="text-xs mt-0.5">
                                      by {collection.creator_address.slice(0, 6)}…{collection.creator_address.slice(-4)}
                                    </CardDescription>
                                  </div>
                                  {isOwner && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge variant="outline" className={`text-[9px] px-1.5 h-5 ${health.color} border-current/30 bg-current/10`}>
                                            {progress.percentage}%
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="max-w-[180px]">
                                          <p className="font-medium mb-1">{health.label}</p>
                                          <p className="text-xs text-muted-foreground">{progress.completedSteps}/{progress.steps.length} steps</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </CardHeader>

                              <CardContent className="px-4 pb-4 space-y-2.5">
                                {isOwner && !isDeployed && (
                                  <div>
                                    <Progress value={progress.percentage} className="h-1" />
                                    {progress.nextStep && (
                                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                                        <ArrowRight className="w-2.5 h-2.5 text-primary" />
                                        Next: {progress.nextStep.name}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {isDeployed && (
                                  <div>
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="text-muted-foreground">Minted</span>
                                      <span className="font-medium">{collection.minted} / {collection.total_supply}</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1">
                                      <div className="bg-primary h-1 rounded-full" style={{ width: `${collection.total_supply > 0 ? (collection.minted / collection.total_supply) * 100 : 0}%` }} />
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Price</span>
                                  <span className="font-medium">{getCollectionPrice(collection)}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {getPhaseNames(collection).map((phase) => (
                                    <Badge key={phase} variant="secondary" className="text-[10px] h-4 px-1.5">{phase}</Badge>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )
              )}
            </section>
          </div>
        </div>
      </main>

      {/* ── Delete Dialog ───────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteCollectionId} onOpenChange={(open) => !open && setDeleteCollectionId(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Delete Collection?
            </AlertDialogTitle>
          </AlertDialogHeader>
          {(() => {
            const c = collections.find((x) => x.id === deleteCollectionId);
            if (!c) return null;
            return (
              <div className="flex gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {c.image_url ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full"><ImageIcon className="w-5 h-5 text-muted-foreground" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.total_supply} items · {c.status}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Created {formatDistanceToNow(new Date(c.created_at))} ago</p>
                </div>
              </div>
            );
          })()}
          <AlertDialogDescription>
            This collection will be moved to trash and <strong>permanently deleted in 7 days</strong>.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCollectionId && handleDeleteCollection(deleteCollectionId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4 mr-2" />Move to Trash</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
