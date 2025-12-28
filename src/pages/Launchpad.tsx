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
import { Plus, Rocket, Clock, CheckCircle, Sparkles, FlaskConical, Globe, Loader2, FileEdit, Trash2, FolderOpen, Image as ImageIcon, LayoutGrid, ChevronDown, Check, HelpCircle } from "lucide-react";
import { CreateCollectionModal } from "@/components/launchpad/CreateCollectionModal";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import lilypadLogo from "@/assets/lilypad-logo.png";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useSEO } from "@/hooks/useSEO";
import { LaunchpadWalkthrough } from "@/components/walkthrough/LaunchpadWalkthrough";
import { useLaunchpadWalkthrough } from "@/hooks/useLaunchpadWalkthrough";
import { useLaunchpadStats } from "@/hooks/useLaunchpadStats";

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
  creator_address: string;
  total_supply: number;
  minted: number;
  status: string;
  phases: unknown;
  royalty_percent: number;
  created_at: string;
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
  const { network, currentChain } = useWallet();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<DraftCollection | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);

  const isTestnet = network === "testnet";
  const walkthrough = useLaunchpadWalkthrough();
  const { stats, isLoading: statsLoading } = useLaunchpadStats();

  useSEO({
    title: "NFT Launchpad | The Lily Pad",
    description: "Launch your NFT collection on Monad. Create generative art, set mint phases, manage allowlists, and deploy with no-code tools."
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
  }, []);

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
    return collection.status === activeTab;
  });

  const getStepLabel = (step: number) => {
    const steps = ["Basic Info", "Mint Phases", "Layer Setup", "Trait Rules", "Review"];
    return steps[step] || "Unknown";
  };

  const getProgress = (step: number) => {
    return Math.round(((step + 1) / 5) * 100);
  };

  // Get price from phases
  const getPrice = (collection: Collection) => {
    const phases = collection.phases as any[];
    if (!phases || phases.length === 0) return "TBA";
    const publicPhase = phases.find(p => p.id === "public") || phases[0];
    return publicPhase?.price ? `${publicPhase.price} MON` : "Free";
  };

  // Get phase names
  const getPhaseNames = (collection: Collection) => {
    const phases = collection.phases as any[];
    if (!phases || phases.length === 0) return ["public"];
    return phases.map(p => p.id || p.name?.toLowerCase() || "public");
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
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl sm:text-4xl font-bold">Lily Launchpad</h1>
                <Badge 
                  variant="outline" 
                  className={isTestnet 
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30" 
                    : "bg-primary/10 text-primary border-primary/30"
                  }
                >
                  {isTestnet ? (
                    <FlaskConical className="w-3 h-3 mr-1" />
                  ) : (
                    <Globe className="w-3 h-3 mr-1" />
                  )}
                  {currentChain.name}
                </Badge>
                {/* Help button to restart walkthrough */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    walkthrough.resetWalkthrough();
                    walkthrough.startWalkthrough();
                  }}
                  title="Start tutorial"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-muted-foreground">
                Launch your NFT collection on {currentChain.name}
              </p>
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
                    : stats.totalVolume.toLocaleString()} MON
                </div>
              )}
              <p className="text-sm text-muted-foreground">Total Volume</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Dropdown */}
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
                  return (
                    <Card 
                      key={collection.id} 
                      className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
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
                        <Badge 
                          variant="outline" 
                          className={`absolute top-3 right-3 ${statusColors[collection.status as keyof typeof statusColors]}`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{collection.name}</CardTitle>
                        <CardDescription>by {collection.creator_address.slice(0, 6)}...{collection.creator_address.slice(-4)}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="text-muted-foreground">Price</span>
                          <span className="font-medium">{getPrice(collection)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="text-muted-foreground">Supply</span>
                          <span className="font-medium">{collection.minted} / {collection.total_supply}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-muted rounded-full h-2 mb-3">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${collection.total_supply > 0 ? (collection.minted / collection.total_supply) * 100 : 0}%` }}
                          />
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

      <CreateCollectionModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen}
        onCollectionCreated={fetchCollections}
      />
    </div>
  );
}