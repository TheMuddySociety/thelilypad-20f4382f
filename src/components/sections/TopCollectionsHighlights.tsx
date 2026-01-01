import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ArrowRightLeft, ShoppingCart, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface CollectionStat {
  id: string;
  name: string;
  image_url: string | null;
  symbol: string;
  value: number;
}

interface TopCollections {
  byVolume: CollectionStat[];
  byTrades: CollectionStat[];
  bySells: CollectionStat[];
  byBuys: CollectionStat[];
}

const categories = [
  { 
    key: "byVolume" as const, 
    title: "Top Volume", 
    icon: TrendingUp, 
    format: (v: number) => `${v.toFixed(2)} MON`,
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-400"
  },
  { 
    key: "byTrades" as const, 
    title: "Most Traded", 
    icon: ArrowRightLeft, 
    format: (v: number) => `${v} trades`,
    gradient: "from-blue-500/20 to-indigo-500/20",
    iconColor: "text-blue-400"
  },
  { 
    key: "bySells" as const, 
    title: "Top Sellers", 
    icon: ShoppingCart, 
    format: (v: number) => `${v} sales`,
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-400"
  },
  { 
    key: "byBuys" as const, 
    title: "Most Bought", 
    icon: Wallet, 
    format: (v: number) => `${v} buys`,
    gradient: "from-orange-500/20 to-amber-500/20",
    iconColor: "text-orange-400"
  },
];

export const TopCollectionsHighlights: React.FC = () => {
  const [topCollections, setTopCollections] = useState<TopCollections>({
    byVolume: [],
    byTrades: [],
    bySells: [],
    byBuys: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTopCollections();

    // Subscribe to real-time updates on nft_listings
    const channel = supabase
      .channel('top-collections-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nft_listings'
        },
        () => {
          // Refetch when any listing changes (new sale, etc.)
          fetchTopCollections();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collections'
        },
        () => {
          // Refetch when collections change
          fetchTopCollections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTopCollections = async () => {
    try {
      // Fetch all sold listings with their NFT's collection info
      const { data: listings, error: listingsError } = await supabase
        .from("nft_listings")
        .select(`
          price,
          seller_id,
          buyer_id,
          nft_id,
          minted_nfts!inner(collection_id)
        `)
        .eq("status", "sold");

      if (listingsError) throw listingsError;

      // Fetch all collections
      const { data: collections, error: collectionsError } = await supabase
        .from("collections")
        .select("id, name, image_url, symbol");

      if (collectionsError) throw collectionsError;

      // Aggregate stats per collection
      const collectionStats: Record<string, {
        volume: number;
        trades: number;
        uniqueSellers: Set<string>;
        uniqueBuyers: Set<string>;
      }> = {};

      listings?.forEach((listing) => {
        const collectionId = (listing.minted_nfts as any)?.collection_id;
        if (!collectionId) return;

        if (!collectionStats[collectionId]) {
          collectionStats[collectionId] = {
            volume: 0,
            trades: 0,
            uniqueSellers: new Set(),
            uniqueBuyers: new Set(),
          };
        }

        collectionStats[collectionId].volume += Number(listing.price) || 0;
        collectionStats[collectionId].trades += 1;
        if (listing.seller_id) collectionStats[collectionId].uniqueSellers.add(listing.seller_id);
        if (listing.buyer_id) collectionStats[collectionId].uniqueBuyers.add(listing.buyer_id);
      });

      // Map collections with their stats
      const collectionsWithStats = collections?.map((c) => ({
        ...c,
        volume: collectionStats[c.id]?.volume || 0,
        trades: collectionStats[c.id]?.trades || 0,
        sells: collectionStats[c.id]?.uniqueSellers.size || 0,
        buys: collectionStats[c.id]?.uniqueBuyers.size || 0,
      })) || [];

      // Sort and get top 3 for each category
      const byVolume = [...collectionsWithStats]
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 3)
        .map((c) => ({ id: c.id, name: c.name, image_url: c.image_url, symbol: c.symbol, value: c.volume }));

      const byTrades = [...collectionsWithStats]
        .sort((a, b) => b.trades - a.trades)
        .slice(0, 3)
        .map((c) => ({ id: c.id, name: c.name, image_url: c.image_url, symbol: c.symbol, value: c.trades }));

      const bySells = [...collectionsWithStats]
        .sort((a, b) => b.sells - a.sells)
        .slice(0, 3)
        .map((c) => ({ id: c.id, name: c.name, image_url: c.image_url, symbol: c.symbol, value: c.sells }));

      const byBuys = [...collectionsWithStats]
        .sort((a, b) => b.buys - a.buys)
        .slice(0, 3)
        .map((c) => ({ id: c.id, name: c.name, image_url: c.image_url, symbol: c.symbol, value: c.buys }));

      setTopCollections({ byVolume, byTrades, bySells, byBuys });
    } catch (error) {
      console.error("Error fetching top collections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/20" />
      
      <div className="relative z-10 container mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Collection Highlights
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover the top performing NFT collections on The Lily Pad
          </p>
        </motion.div>

        {/* Categories Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
          {categories.map((category) => {
            const Icon = category.icon;
            const collections = topCollections[category.key];

            return (
              <motion.div key={category.key} variants={itemVariants}>
                <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm h-full">
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-50`} />
                  
                  <CardContent className="relative p-6">
                    {/* Category Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`p-2.5 rounded-xl bg-background/80 ${category.iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-lg text-foreground">
                        {category.title}
                      </h3>
                    </div>

                    {/* Collection List */}
                    <div className="space-y-4">
                      {isLoading ? (
                        <>
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                              <Skeleton className="w-10 h-10 rounded-lg" />
                              <div className="flex-1">
                                <Skeleton className="h-4 w-24 mb-1" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </div>
                          ))}
                        </>
                      ) : collections.length > 0 ? (
                        collections.map((collection, index) => (
                          <Link
                            key={collection.id}
                            to={`/collection/${collection.id}`}
                          >
                            <motion.div
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 transition-colors cursor-pointer group"
                              whileHover={{ x: 4 }}
                            >
                              {/* Rank Badge */}
                              <div className="w-6 h-6 rounded-full bg-background/80 flex items-center justify-center text-xs font-bold text-muted-foreground">
                                {index + 1}
                              </div>
                              
                              {/* Collection Image */}
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                {collection.image_url ? (
                                  <img
                                    src={collection.image_url}
                                    alt={collection.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                                    {collection.symbol?.slice(0, 2) || "?"}
                                  </div>
                                )}
                              </div>

                              {/* Collection Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                  {collection.name}
                                </p>
                                <p className={`text-xs ${category.iconColor}`}>
                                  {category.format(collection.value)}
                                </p>
                              </div>
                            </motion.div>
                          </Link>
                        ))
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No data yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
        })}
        </motion.div>
      </div>
    </section>
  );
};
