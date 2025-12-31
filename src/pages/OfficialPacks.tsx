import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Leaf, Sparkles, Sticker, Smile, Image, ShoppingCart, Eye, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OfficialPack {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  tier: string;
  price_mon: number;
  total_sales: number;
  created_at: string;
}

const OfficialPacks: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ['official-packs-shop'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_items")
        .select("*")
        .eq("creator_type", "platform")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OfficialPack[];
    }
  });

  const filteredPacks = packs.filter(pack => {
    if (activeTab === "all") return true;
    return pack.category === activeTab;
  });

  const lilyPadPacks = filteredPacks.filter(p => p.name.toLowerCase().includes("lily") || p.name.toLowerCase().includes("frog"));
  const otherPacks = filteredPacks.filter(p => !p.name.toLowerCase().includes("lily") && !p.name.toLowerCase().includes("frog"));

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "sticker_pack": return <Sticker className="w-4 h-4" />;
      case "emote_pack": return <Smile className="w-4 h-4" />;
      case "emoji_pack": return <Image className="w-4 h-4" />;
      default: return <Sticker className="w-4 h-4" />;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "premium":
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"><Crown className="w-3 h-3 mr-1" />Premium</Badge>;
      case "exclusive":
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"><Sparkles className="w-3 h-3 mr-1" />Exclusive</Badge>;
      default:
        return <Badge variant="secondary">Basic</Badge>;
    }
  };

  const PackCard = ({ pack }: { pack: OfficialPack }) => (
    <Card 
      className="group overflow-hidden hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/30"
      onClick={() => navigate(`/marketplace/sticker/${pack.id}`)}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
        {pack.image_url ? (
          <img 
            src={pack.image_url} 
            alt={pack.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getCategoryIcon(pack.category)}
          </div>
        )}
        
        {/* Official Badge Overlay */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-primary/90 text-primary-foreground border-0 gap-1">
            <Leaf className="w-3 h-3" />
            Official
          </Badge>
        </div>
        
        {/* Price Overlay */}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm font-bold">
            {pack.price_mon > 0 ? `${pack.price_mon} MON` : "FREE"}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {pack.name}
          </h3>
          {getTierBadge(pack.tier)}
        </div>
        
        {pack.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {pack.description}
          </p>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {getCategoryIcon(pack.category)}
            <span className="capitalize">{pack.category.replace("_", " ")}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ShoppingCart className="w-3 h-3" />
            {pack.total_sales} sold
          </div>
        </div>
        
        <Button className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Eye className="w-4 h-4" />
          View Pack
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-28 pb-12">
        {/* Hero Section */}
        <div className="relative mb-12 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(var(--primary-rgb),0.15),transparent_50%)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                <Leaf className="w-8 h-8 text-primary" />
              </div>
              <div className="p-3 rounded-xl bg-secondary/20 backdrop-blur-sm">
                <Sparkles className="w-8 h-8 text-secondary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Official Lily Pad & Frognad Packs
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Exclusive sticker packs, emotes, and emojis created by The Lily Pad team. 
              Show your support and express yourself with our official collection!
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-4 mx-auto">
            <TabsTrigger value="all" className="gap-1">
              <Sparkles className="w-4 h-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="sticker_pack" className="gap-1">
              <Sticker className="w-4 h-4" />
              Stickers
            </TabsTrigger>
            <TabsTrigger value="emote_pack" className="gap-1">
              <Smile className="w-4 h-4" />
              Emotes
            </TabsTrigger>
            <TabsTrigger value="emoji_pack" className="gap-1">
              <Image className="w-4 h-4" />
              Emoji
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredPacks.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <Sticker className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No Packs Available</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Official packs are coming soon! Check back later for exclusive 
              Lily Pad and Frognad stickers, emotes, and emojis.
            </p>
          </div>
        )}

        {/* Packs Grid */}
        {!isLoading && filteredPacks.length > 0 && (
          <div className="space-y-12">
            {/* Featured/Lily Pad Packs */}
            {lilyPadPacks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Leaf className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Featured Packs</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {lilyPadPacks.map((pack) => (
                    <PackCard key={pack.id} pack={pack} />
                  ))}
                </div>
              </section>
            )}
            
            {/* Other Official Packs */}
            {otherPacks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-secondary-foreground" />
                  <h2 className="text-xl font-semibold">More Official Packs</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {otherPacks.map((pack) => (
                    <PackCard key={pack.id} pack={pack} />
                  ))}
                </div>
              </section>
            )}
            
            {/* If no categorization needed, show all */}
            {lilyPadPacks.length === 0 && otherPacks.length === 0 && filteredPacks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPacks.map((pack) => (
                  <PackCard key={pack.id} pack={pack} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default OfficialPacks;
