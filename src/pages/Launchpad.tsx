import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Rocket, Clock, CheckCircle, Sparkles, FlaskConical, Globe, Loader2, FileEdit, Trash2, FolderOpen, Image as ImageIcon, LayoutGrid, ChevronDown, Check, HelpCircle, Pencil, Lock, AlertCircle, ArrowRight, Layers, FileImage, Users, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateCollectionModal } from "@/components/launchpad/CreateCollectionModal";
import { useWallet, ChainType } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import lilypadLogo from "@/assets/lilypad-logo.png";
import { toast } from "sonner";
import { formatDistanceToNow, addDays } from "date-fns";
import { useSEO } from "@/hooks/useSEO";
import { LaunchpadWalkthrough } from "@/components/walkthrough/LaunchpadWalkthrough";
import { useLaunchpadWalkthrough } from "@/hooks/useLaunchpadWalkthrough";
import { useLaunchpadStats } from "@/hooks/useLaunchpadStats";
import { RecentSalesTable } from "@/components/launchpad/RecentSalesTable";
import { BuybackProgramBadge } from "@/components/BuybackProgramBadge";
import { useBuybackProgram } from "@/hooks/useBuybackProgram";
import { HomepageFeaturedCollections } from "@/components/sections/HomepageFeaturedCollections";
import { ChainSelector, ChainBadge } from "@/components/ChainSelector";
import { PlatformSwitcher, Platform } from "@/components/launchpad/PlatformSwitcher";
import { getCollectionPrice } from "@/lib/chainUtils";

interface DraftCollection {
  name: string;
  symbol: string;
  description: string;
  totalSupply: string;
  royalty: string;
  currentStep: number;
  savedAt: string;
  layers?: any[];
  phases?: any[];
  imageUrl?: string;
  oneOfOneArtworks?: any[];
}

interface Collection {
  id: string;
  name: string;
  image_url: string | null;
  banner_url: string | null;
  description: string | null;
  creator_address: string;
  creator_id: string;
  total_supply: number;
  minted: number;
  status: string;
  phases: unknown;
  royalty_percent: number;
  created_at: string;
  contract_address: string | null;
  collection_type: string | null;
  layers_metadata: unknown;
  artworks_metadata: unknown;
  social_twitter: string | null;
  social_discord: string | null;
  social_website: string | null;
  chain: string;
}

const statusColors = {
  live: "bg-green-500/20 text-green-400 border-green-500/30",
  upcoming: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ended: "bg-muted text-muted-foreground border-border",
};

const statusIcons = {
  live: Sparkles,
  upcoming: Clock,
  ended: CheckCircle,
};

export default function Launchpad() {
  const navigate = useNavigate();
  const { network, chainType } = useWallet();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<DraftCollection | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainType>("solana");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(() => {
    const saved = localStorage.getItem("selectedPlatform");
    if (saved === "solana" || saved === "monad") return saved as Platform;
    return "solana";
  });

  useEffect(() => {
    localStorage.setItem("selectedPlatform", selectedPlatform);
  }, [selectedPlatform]);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isTestnet = network === "testnet";
  const walkthrough = useLaunchpadWalkthrough();
  const { stats, isLoading: statsLoading } = useLaunchpadStats();
  const { isInProgram } = useBuybackProgram();

  useSEO({
    title: "NFT Launchpad | The Lily Pad",
    description: "Launch your NFT collection on Solana & Monad. Create generative art, set mint phases, manage allowlists, and deploy with no-code tools."
  });

  const loadDraft = () => {
    const savedDraft = localStorage.getItem("collection-draft");
    if (savedDraft) {
      try {
        setDraft(JSON.parse(savedDraft));
      } catch (e) {
        console.error("Error loading draft:", e);
        setDraft(null);
      }
    } else {
      setDraft(null);
    }
  };

  const deleteDraft = () => {
    localStorage.removeItem("collection-draft");
    setDraft(null);
    toast.success("Draft deleted");
  };

  const deleteCollection = async (collectionId: string) => {
    setIsDeleting(true);
    const collectionToDelete = collections.find(c => c.id === collectionId);
    const collectionName = collectionToDelete?.name || "Collection";

    try {
      const scheduledDeleteAt = addDays(new Date(), 7);

      const { error } = await supabase
        .from("collections")
        .update({
          deleted_at: new Date().toISOString(),
          scheduled_permanent_delete_at: scheduledDeleteAt.toISOString()
        })
        .eq("id", collectionId);

      if (error) throw error;

      setDeleteCollectionId(null);
      await fetchCollections();

      toast.success(`"${collectionName}" moved to trash`, {
        description: "Will be permanently deleted in 7 days",
        action: {
          label: "Undo",
          onClick: () => handleUndoDelete(collectionId, collectionName),
        },
      });
    } catch (error: any) {
      console.error("Error deleting collection:", error);
      toast.error(error.message || "Failed to delete collection");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUndoDelete = async (collectionId: string, collectionName: string) => {
    try {
      const { error } = await supabase
        .from("collections")
        .update({
          deleted_at: null,
          scheduled_permanent_delete_at: null
        })
        .eq("id", collectionId);

      if (error) {
        toast.error("Failed to restore collection");
      } else {
        toast.success("Collection restored", {
          description: `"${collectionName}" has been restored`,
        });
        fetchCollections();
      }
    } catch (err) {
      console.error("Error restoring collection:", err);
    }
  };

  const continueDraft = () => {
    setEditingDraft(true);
    setIsCreateModalOpen(true);
  };

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .in("chain", ["solana", "solana-devnet", "solana-mainnet"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching collections:", error);
      } else {
        setCollections(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    loadDraft();
  }, [selectedPlatform]);

  // Reload draft when modal closes
  useEffect(() => {
    if (!isCreateModalOpen) {
      loadDraft();
      setEditingDraft(false);
    }
  }, [isCreateModalOpen]);

  const filteredCollections = collections.filter((collection) => {
    if (activeTab === "all") return true;
    if (activeTab === "drafts") return false; // Drafts handled separately

    // Filter for Solana collections only
    if (!collection.chain.includes("solana")) return false;

    return collection.status === activeTab;
  });

  const getStepLabel = (step: number) => {
    const steps = ["Basic Info", "Mint Phases", "Layer Setup", "Trait Rules", "Review"];
    return steps[step] || "Unknown";
  };

  const getProgress = (step: number) => {
    return Math.round(((step + 1) / 5) * 100);
  };

  // Get price from phases - chain-aware
  const getPrice = (collection: Collection) => {
    return getCollectionPrice(collection);
  };

  // Get phase names
  const getPhaseNames = (collection: Collection) => {
    const phases = collection.phases as any[];
    if (!phases || phases.length === 0) return ["public"];
    return phases.map(p => p.id || p.name?.toLowerCase() || "public");
  };

  // Calculate collection setup progress
  const getCollectionProgress = (collection: Collection) => {
    const steps = [
      { name: "Basic Info", complete: !!(collection.name && collection.total_supply > 0), icon: FileEdit },
      { name: "Cover Image", complete: !!collection.image_url, icon: ImageIcon },
      { name: "Artwork/Layers", complete: hasArtwork(collection), icon: Layers },
      { name: "Mint Phases", complete: hasValidPhases(collection), icon: Clock },
      { name: "Deploy Contract", complete: !!collection.contract_address, icon: Rocket },
    ];

    const completedSteps = steps.filter(s => s.complete).length;
    const percentage = Math.round((completedSteps / steps.length) * 100);
    const nextStep = steps.find(s => !s.complete);

    return { steps, completedSteps, percentage, nextStep };
  };

  const hasArtwork = (collection: Collection) => {
    const type = collection.collection_type || "generative";
    if (type === "generative") {
      const layers = collection.layers_metadata as any[] | null;
      return layers && layers.length > 0 && layers.some(l => l.traits && l.traits.length > 0);
    } else {
      const artworks = collection.artworks_metadata as any[] | null;
      return artworks && artworks.length > 0;
    }
  };

  const hasValidPhases = (collection: Collection) => {
    const phases = collection.phases as any[];
    return phases && phases.length > 0 && phases.some(p => p.supply > 0);
  };

  // Get collection health status
  const getHealthStatus = (collection: Collection) => {
    const progress = getCollectionProgress(collection);
    const isDeployed = !!collection.contract_address;

    if (isDeployed && collection.status === "live") {
      return { status: "healthy", label: "Live & Active", color: "text-green-500" };
    }
    if (isDeployed) {
      return { status: "deployed", label: "Deployed", color: "text-blue-500" };
    }
    if (progress.percentage >= 80) {
      return { status: "ready", label: "Ready to Deploy", color: "text-primary" };
    }
    if (progress.percentage >= 40) {
      return { status: "in-progress", label: "Setup In Progress", color: "text-yellow-500" };
    }
    return { status: "needs-setup", label: "Needs Setup", color: "text-orange-500" };
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <LaunchpadWalkthrough walkthrough={walkthrough} />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8" data-walkthrough="header">
          <div className="flex items-center gap-4">
            <img
              src={lilypadLogo}
              alt="Lily Launchpad"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-contain bg-primary/10 p-2"
            />
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-bold">Lily Launchpad</h1>
                  <Badge
                    variant="outline"
                    className={isTestnet
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      : "bg-primary/10 text-primary border-primary/30"
                    }
                  >
                    <Globe className="w-3 h-3 mr-1" />
                    {isTestnet ? "Solana Devnet" : "Solana Mainnet"}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-4">
                  Launch your NFT collection on Solana
              </p>
              <PlatformSwitcher
                selected={selectedPlatform}
                onChange={setSelectedPlatform}
              />
            </div>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="lg"
            className="gap-2"
            data-walkthrough="create-button"
          >
            <Plus className="w-5 h-5" />
            Create Collection
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-walkthrough="stats">
          <Card>
            <CardContent className="pt-6">
              {statsLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{stats.totalCollections.toLocaleString()}</div>
              )}
              <p className="text-sm text-muted-foreground">Total Collections</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {statsLoading ? (
                <Skeleton className="h-8 w-12 mb-1" />
              ) : (
                <div className="text-2xl font-bold flex items-center gap-2">
                  {stats.liveNow}
                  {stats.liveNow > 0 && (
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground">Live Now</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {statsLoading ? (
                <Skeleton className="h-8 w-20 mb-1" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats.nftsMinted >= 1000000
                    ? `${(stats.nftsMinted / 1000000).toFixed(1)}M`
                    : stats.nftsMinted >= 1000
                      ? `${(stats.nftsMinted / 1000).toFixed(1)}K`
                      : stats.nftsMinted.toLocaleString()}
                </div>
              )}
              <p className="text-sm text-muted-foreground">NFTs Minted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              {statsLoading ? (
                <Skeleton className="h-8 w-24 mb-1" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats.totalVolume >= 1000
                    ? `${(stats.totalVolume / 1000).toFixed(1)}K`
                    : stats.totalVolume.toLocaleString()} SOL
                </div>
              )}
              <p className="text-sm text-muted-foreground">Total Volume</p>
            </CardContent>
          </Card>
        </div>

        {/* Featured Collections */}
        <HomepageFeaturedCollections />

        {/* Recent Sales */}
        <div className="mb-8">
          <RecentSalesTable />
        </div>
        {(() => {
          const filterOptions = [
            { value: "all", label: "All Collections", icon: LayoutGrid },
            { value: "live", label: "Live", icon: Sparkles },
            { value: "upcoming", label: "Upcoming", icon: Clock },
            { value: "ended", label: "Ended", icon: CheckCircle },
            { value: "drafts", label: "My Drafts", icon: FileEdit },
          ];
          const selectedOption = filterOptions.find(opt => opt.value === activeTab) || filterOptions[0];
          const SelectedIcon = selectedOption.icon;

          return (
            <div className="mb-8" data-walkthrough="filter">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 min-w-[180px] justify-between">
                    <div className="flex items-center gap-2">
                      <SelectedIcon className="w-4 h-4" />
                      <span>{selectedOption.label}</span>
                      {activeTab === "drafts" && draft && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">1</Badge>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px] bg-popover">
                  {filterOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = activeTab === option.value;
                    return (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setActiveTab(option.value)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{option.label}</span>
                          {option.value === "drafts" && draft && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">1</Badge>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })()}

        {/* Drafts Tab Content */}
        {activeTab === "drafts" && (
          <div className="mb-8">
            {draft ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {draft.imageUrl ? (
                        <img
                          src={draft.imageUrl}
                          alt={draft.name || "Draft"}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{draft.name || "Untitled Collection"}</CardTitle>
                        <CardDescription>
                          Last saved {formatDistanceToNow(new Date(draft.savedAt), { addSuffix: true })}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                      Draft
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress indicator */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{getProgress(draft.currentStep)}% - {getStepLabel(draft.currentStep)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${getProgress(draft.currentStep)}%` }}
                        />
                      </div>
                    </div>

                    {/* Draft details */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block">Symbol</span>
                        <span className="font-medium">{draft.symbol || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Supply</span>
                        <span className="font-medium">{draft.totalSupply || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Layers</span>
                        <span className="font-medium">{draft.layers?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Artworks</span>
                        <span className="font-medium">{draft.oneOfOneArtworks?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Phases</span>
                        <span className="font-medium">{draft.phases?.length || 0}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={continueDraft} className="flex-1 gap-2">
                        <FileEdit className="w-4 h-4" />
                        Continue Editing
                      </Button>
                      <Button
                        variant="outline"
                        onClick={deleteDraft}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No drafts found</h3>
                <p className="text-muted-foreground mb-4">
                  Start creating a collection and save your progress
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  Create Collection
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Collections Grid - only show when not on drafts tab */}
        {activeTab !== "drafts" && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCollections.map((collection) => {
                  const StatusIcon = statusIcons[collection.status as keyof typeof statusIcons];
                  const isOwner = currentUserId && collection.creator_id === currentUserId;
                  const isDeployed = !!collection.contract_address;
                  const canEdit = isOwner && !isDeployed;
                  const progress = getCollectionProgress(collection);
                  const health = getHealthStatus(collection);

                  return (
                    <Card
                      key={collection.id}
                      className={`overflow-hidden hover:border-primary/50 transition-colors cursor-pointer ${canEdit ? 'border-amber-500/30' : ''}`}
                      onClick={() => navigate(`/launchpad/${collection.id}`)}
                    >
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        {collection.image_url ? (
                          <img
                            src={collection.image_url}
                            alt={collection.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Rocket className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 flex gap-2">
                          {collection.chain.includes("solana") ? (
                            <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-md border-white/10 h-6">
                              <Globe className="w-3 h-3 mr-1" />
                              SOL
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-purple-500/50 text-white backdrop-blur-md border-white/10 h-6">
                              <Zap className="w-3 h-3 mr-1" />
                              MON
                            </Badge>
                          )}
                          {canEdit && (
                            <>
                              <Badge
                                variant="outline"
                                className="bg-amber-500/20 text-amber-400 border-amber-500/30"
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                Editable
                              </Badge>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteCollectionId(collection.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {isOwner && isDeployed && (
                            <Badge
                              variant="outline"
                              className="bg-green-500/20 text-green-400 border-green-500/30"
                            >
                              <Lock className="w-3 h-3 mr-1" />
                              Deployed
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`absolute top-3 left-3 ${statusColors[collection.status as keyof typeof statusColors]}`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{collection.name}</CardTitle>
                              {isInProgram(collection.id) && <BuybackProgramBadge />}
                            </div>
                            <CardDescription>by {collection.creator_address.slice(0, 6)}...{collection.creator_address.slice(-4)}</CardDescription>
                          </div>
                          {isOwner && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 ${health.color} border-current/30 bg-current/10`}
                                  >
                                    {progress.percentage}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[200px]">
                                  <p className="font-medium mb-1">{health.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {progress.completedSteps}/{progress.steps.length} steps complete
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Setup Progress (only for owner's undeployed collections) */}
                        {isOwner && !isDeployed && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Setup Progress</span>
                              <span className={`font-medium ${health.color}`}>{health.label}</span>
                            </div>
                            <Progress value={progress.percentage} className="h-1.5" />
                            <div className="flex items-center gap-1">
                              {progress.steps.map((step, i) => {
                                const StepIcon = step.icon;
                                return (
                                  <TooltipProvider key={step.name}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={`flex-1 h-1 rounded-full transition-colors ${step.complete ? 'bg-primary' : 'bg-muted'
                                            }`}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="flex items-center gap-1.5">
                                          <StepIcon className="w-3 h-3" />
                                          <span>{step.name}</span>
                                          {step.complete ? (
                                            <Check className="w-3 h-3 text-green-500" />
                                          ) : (
                                            <AlertCircle className="w-3 h-3 text-muted-foreground" />
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                            {progress.nextStep && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <ArrowRight className="w-3 h-3 text-primary" />
                                <span>Next: {progress.nextStep.name}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mint Progress (for deployed collections) */}
                        {isDeployed && (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Minted</span>
                              <span className="font-medium">{collection.minted} / {collection.total_supply}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${collection.total_supply > 0 ? (collection.minted / collection.total_supply) * 100 : 0}%` }}
                              />
                            </div>
                          </>
                        )}

                        {/* Price and Phases */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Price</span>
                          <span className="font-medium">{getPrice(collection)}</span>
                        </div>

                        {/* Phases */}
                        <div className="flex flex-wrap gap-1">
                          {getPhaseNames(collection).map((phase) => (
                            <Badge key={phase} variant="secondary" className="text-xs">
                              {phase}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {!isLoading && filteredCollections.length === 0 && (
              <div className="text-center py-12">
                <Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No collections found</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to launch a collection!
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  Create Collection
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {isCreateModalOpen && (
        <CreateCollectionModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onCollectionCreated={() => {
            fetchCollections();
            setIsCreateModalOpen(false);
          }}
          defaultChain={selectedPlatform}
        />
      )}
      {/* Delete Collection Confirmation */}
      <AlertDialog open={!!deleteCollectionId} onOpenChange={(open) => !open && setDeleteCollectionId(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Delete Collection?
            </AlertDialogTitle>
          </AlertDialogHeader>

          {/* Collection Preview Card */}
          {(() => {
            const collectionToDelete = collections.find(c => c.id === deleteCollectionId);
            if (!collectionToDelete) return null;
            return (
              <div className="flex gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  {collectionToDelete.image_url ? (
                    <img
                      src={collectionToDelete.image_url}
                      alt={collectionToDelete.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{collectionToDelete.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">{collectionToDelete.status}</Badge>
                    <span>•</span>
                    <span>{collectionToDelete.total_supply} items</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {formatDistanceToNow(new Date(collectionToDelete.created_at))} ago
                  </p>
                </div>
              </div>
            );
          })()}

          <AlertDialogDescription className="text-sm">
            This collection will be moved to trash and <strong>permanently deleted in 7 days</strong>. You can undo this action immediately after deletion.
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>All collection metadata and settings</li>
              <li>All layers and trait configurations</li>
              <li>All artwork uploads</li>
              <li>Allowlist entries</li>
            </ul>
          </AlertDialogDescription>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCollectionId && deleteCollection(deleteCollectionId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Move to Trash
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}