import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Rocket, Clock, CheckCircle, Sparkles, FlaskConical, Globe, Loader2 } from "lucide-react";
import { CreateCollectionModal } from "@/components/launchpad/CreateCollectionModal";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import lilypadLogo from "@/assets/lilypad-logo.png";

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

  const isTestnet = network === "testnet";

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
  }, []);

  const filteredCollections = collections.filter((collection) => {
    if (activeTab === "all") return true;
    return collection.status === activeTab;
  });

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
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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
              </div>
              <p className="text-muted-foreground">
                Launch your NFT collection on {currentChain.name}
              </p>
            </div>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Create Collection
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">127</div>
              <p className="text-sm text-muted-foreground">Total Collections</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">12</div>
              <p className="text-sm text-muted-foreground">Live Now</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">1.2M</div>
              <p className="text-sm text-muted-foreground">NFTs Minted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">5.4K MON</div>
              <p className="text-sm text-muted-foreground">Total Volume</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="ended">Ended</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Collections Grid */}
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
      </main>

      <CreateCollectionModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen}
        onCollectionCreated={fetchCollections}
      />
    </div>
  );
}