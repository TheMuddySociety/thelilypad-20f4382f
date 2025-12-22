import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Rocket, Clock, CheckCircle, Sparkles } from "lucide-react";
import { CreateCollectionModal } from "@/components/launchpad/CreateCollectionModal";

// Demo collections for UI - will be replaced with on-chain data
const demoCollections = [
  {
    id: "1",
    name: "Monad Frogs",
    image: "https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=400&h=400&fit=crop",
    creator: "0x1234...5678",
    totalSupply: 5000,
    minted: 3420,
    price: "0.5 MON",
    status: "live",
    phases: ["public"],
  },
  {
    id: "2",
    name: "Lily Genesis",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
    creator: "0xabcd...efgh",
    totalSupply: 10000,
    minted: 0,
    price: "Free",
    status: "upcoming",
    phases: ["team", "partners", "allowlist", "public"],
  },
  {
    id: "3",
    name: "Nads Collection",
    image: "https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=400&h=400&fit=crop",
    creator: "0x9876...4321",
    totalSupply: 2500,
    minted: 2500,
    price: "1 MON",
    status: "ended",
    phases: ["allowlist", "public"],
  },
];

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const filteredCollections = demoCollections.filter((collection) => {
    if (activeTab === "all") return true;
    return collection.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">NFT Launchpad</h1>
            <p className="text-muted-foreground">
              Launch your NFT collection on Monad Mainnet
            </p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((collection) => {
            const StatusIcon = statusIcons[collection.status as keyof typeof statusIcons];
            return (
              <Card 
                key={collection.id} 
                className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/launchpad/${collection.id}`)}
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={collection.image}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                  />
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
                  <CardDescription>by {collection.creator}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">{collection.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground">Supply</span>
                    <span className="font-medium">{collection.minted} / {collection.totalSupply}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2 mb-3">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(collection.minted / collection.totalSupply) * 100}%` }}
                    />
                  </div>
                  {/* Phases */}
                  <div className="flex flex-wrap gap-1">
                    {collection.phases.map((phase) => (
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

        {filteredCollections.length === 0 && (
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
      />
    </div>
  );
}