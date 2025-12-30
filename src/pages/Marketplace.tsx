import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BuyNFTModal } from "@/components/BuyNFTModal";
import { NFTSalesAnalytics } from "@/components/NFTSalesAnalytics";
import { LilyPadVerificationBadge } from "@/components/LilyPadVerificationBadge";
import { Rocket, Sparkles, Loader2, ChevronDown, Check, Image as ImageIcon, Sticker, LayoutGrid, Clock, CheckCircle, Tag, ShoppingCart, BarChart3, Shield, Leaf, Flame, TrendingUp, Ban } from "lucide-react";
import { LilyPadLogo } from "@/components/LilyPadLogo";
import { TopCollectionsHighlights } from "@/components/sections/TopCollectionsHighlights";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { isFactoryConfigured } from "@/config/nftFactory";

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
  contract_address: string | null;
}

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_mon: number;
  category: string;
  tier: string;
  total_sales: number;
  creator_id: string;
  is_active: boolean;
  created_at: string;
}

interface NFTListing {
  id: string;
  nft_id: string;
  seller_id: string;
  seller_address: string;
  price: number;
  currency: string;
  created_at: string;
  expires_at: string | null;
  nft: {
    id: string;
    token_id: number;
    name: string | null;
    image_url: string | null;
    collection_id: string | null;
    owner_address: string;
    collection?: {
      name: string;
      contract_address: string | null;
    };
  };
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

export default function Marketplace() {
  const navigate = useNavigate();
  const { network, currentChain } = useWallet();
  const [activeFilter, setActiveFilter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showHotOnly, setShowHotOnly] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [stickerPacks, setStickerPacks] = useState<ShopItem[]>([]);
  const [nftListings, setNftListings] = useState<NFTListing[]>([]);
  const [hotCollectionMints, setHotCollectionMints] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<NFTListing | null>(null);

  // Check if factory is configured (for showing verified filter)
  const factoryAvailable = isFactoryConfigured();

  useSEO({
    title: "Lily Marketplace | The Lily Pad",
    description: "Browse NFT collections, listings, and sticker packs on Lily Marketplace. Discover unique digital collectibles on Monad."
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch collections - filter out deleted ones and show live/upcoming first
      const { data: collectionsData, error: collectionsError } = await supabase
        .from("collections")
        .select("*")
        .is("deleted_at", null)
        .order("status", { ascending: true }) // live comes before upcoming
        .order("created_at", { ascending: false });

      if (collectionsError) {
        console.error("Error fetching collections:", collectionsError);
      } else {
        // Sort to prioritize live status
        const sorted = (collectionsData || []).sort((a, b) => {
          if (a.status === 'live' && b.status !== 'live') return -1;
          if (a.status !== 'live' && b.status === 'live') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setCollections(sorted);
      }

      // Fetch recent mints (last 24 hours) to determine "hot" collections
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentMints, error: mintsError } = await supabase
        .from("minted_nfts")
        .select("collection_id")
        .gte("minted_at", twentyFourHoursAgo);

      if (!mintsError && recentMints) {
        // Count mints per collection
        const mintCounts = recentMints.reduce((acc, mint) => {
          if (mint.collection_id) {
            acc[mint.collection_id] = (acc[mint.collection_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        // Collections with 3+ mints in 24h are "hot" - store the counts
        const hotMints = new Map(
          Object.entries(mintCounts)
            .filter(([_, count]) => count >= 3)
        );
        setHotCollectionMints(hotMints);
      }

      // Fetch sticker packs
      const { data: stickersData, error: stickersError } = await supabase
        .from("shop_items")
        .select("*")
        .eq("category", "sticker_pack")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (stickersError) {
        console.error("Error fetching sticker packs:", stickersError);
      } else {
        setStickerPacks(stickersData || []);
      }

      // Fetch active NFT listings
      const { data: listingsData, error: listingsError } = await supabase
        .from("nft_listings")
        .select(`
          *,
          nft:minted_nfts(
            id,
            token_id,
            name,
            image_url,
            collection_id,
            owner_address,
            collection:collections(name, contract_address)
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (listingsError) {
        console.error("Error fetching listings:", listingsError);
      } else {
        // Transform data to match our interface
        const transformedListings = (listingsData || []).map(listing => ({
          ...listing,
          nft: listing.nft ? {
            ...listing.nft,
            collection: listing.nft.collection as { name: string; contract_address: string | null } | undefined
          } : null
        })).filter(listing => listing.nft !== null) as NFTListing[];
        setNftListings(transformedListings);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time subscriptions for automatic updates
  useEffect(() => {
    const collectionsChannel = supabase
      .channel('marketplace-collections-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collections' },
        () => fetchData()
      )
      .subscribe();

    const listingsChannel = supabase
      .channel('marketplace-listings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nft_listings' },
        () => fetchData()
      )
      .subscribe();

    const shopItemsChannel = supabase
      .channel('marketplace-shop-items-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_items' },
        () => fetchData()
      )
      .subscribe();

    const mintedNftsChannel = supabase
      .channel('marketplace-minted-nfts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'minted_nfts' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(collectionsChannel);
      supabase.removeChannel(listingsChannel);
      supabase.removeChannel(shopItemsChannel);
      supabase.removeChannel(mintedNftsChannel);
    };
  }, []);

  // Get price from phases
  const getPrice = (collection: Collection) => {
    const phases = collection.phases as any[];
    if (!phases || phases.length === 0) return "TBA";
    const publicPhase = phases.find(p => p.id === "public") || phases[0];
    return publicPhase?.price ? `${publicPhase.price} MON` : "Free";
  };

  const filterOptions = [
    { value: "all", label: "All Items", icon: LayoutGrid },
    { value: "analytics", label: "Analytics", icon: BarChart3 },
    { value: "listings", label: "NFT Listings", icon: Tag },
    { value: "collections", label: "Collections", icon: Rocket },
    { value: "stickers", label: "Sticker Packs", icon: Sticker },
  ];

  const selectedOption = filterOptions.find(opt => opt.value === activeFilter) || filterOptions[0];
  const SelectedIcon = selectedOption.icon;

  const showAnalytics = activeFilter === "analytics";
  const showListings = activeFilter === "all" || activeFilter === "listings";
  const showCollections = activeFilter === "all" || activeFilter === "collections";
  const showStickers = activeFilter === "all" || activeFilter === "stickers";

  // Helper to check if collection is "new"
  const isCollectionNew = (collection: Collection) => 
    collection.status === 'live' && 
    new Date(collection.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Filter collections by verified, hot, and new status
  const filteredCollections = collections.filter(c => {
    // Verified filter
    if (verifiedOnly && !c.contract_address) return false;
    // Hot filter
    if (showHotOnly && !hotCollectionMints.has(c.id)) return false;
    // New filter
    if (showNewOnly && !isCollectionNew(c)) return false;
    return true;
  });
  
  const filteredListings = verifiedOnly
    ? nftListings.filter(l => l.nft.collection?.contract_address)
    : nftListings;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <LilyPadLogo size={56} />
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Lily Marketplace</h1>
              <p className="text-muted-foreground">
                Browse collections and sticker packs on {currentChain.name}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{nftListings.length}</div>
              <p className="text-sm text-muted-foreground">NFT Listings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{collections.length}</div>
              <p className="text-sm text-muted-foreground">Collections</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stickerPacks.length}</div>
              <p className="text-sm text-muted-foreground">Sticker Packs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{collections.filter(c => c.status === "live").length}</div>
              <p className="text-sm text-muted-foreground">Live Mints</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stickerPacks.reduce((sum, s) => sum + s.total_sales, 0)}</div>
              <p className="text-sm text-muted-foreground">Stickers Sold</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Collections Highlights */}
        <TopCollectionsHighlights />

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {/* Category Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[180px] justify-between">
                <div className="flex items-center gap-2">
                  <SelectedIcon className="w-4 h-4" />
                  <span>{selectedOption.label}</span>
                </div>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px] bg-popover">
              {filterOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = activeFilter === option.value;
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setActiveFilter(option.value)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Verified Only Toggle */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-primary" />
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <Label 
              htmlFor="verified-filter" 
              className="text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              LilyPad Verified Only
            </Label>
            <Switch
              id="verified-filter"
              checked={verifiedOnly}
              onCheckedChange={setVerifiedOnly}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Hot Only Toggle */}
          <Button
            variant={showHotOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowHotOnly(!showHotOnly);
              if (!showHotOnly) setShowNewOnly(false); // Deselect New when selecting Hot
            }}
            className={`gap-2 ${showHotOnly ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-0' : ''}`}
          >
            <TrendingUp className="w-4 h-4" />
            Hot 🔥
            {showHotOnly && (
              <Badge variant="secondary" className="ml-1 bg-white/20 text-white">
                {hotCollectionMints.size}
              </Badge>
            )}
          </Button>

          {/* New Only Toggle */}
          <Button
            variant={showNewOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowNewOnly(!showNewOnly);
              if (!showNewOnly) setShowHotOnly(false); // Deselect Hot when selecting New
            }}
            className={`gap-2 ${showNewOnly ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0' : ''}`}
          >
            <Flame className="w-4 h-4" />
            New
            {showNewOnly && (
              <Badge variant="secondary" className="ml-1 bg-white/20 text-white">
                {collections.filter(c => isCollectionNew(c)).length}
              </Badge>
            )}
          </Button>

          {/* Verified count badge */}
          {verifiedOnly && (
            <Badge variant="secondary" className="gap-1">
              <Shield className="w-3 h-3" />
              {filteredCollections.length} verified
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Analytics Section */}
            {showAnalytics && (
              <section>
                <NFTSalesAnalytics />
              </section>
            )}

            {/* NFT Listings Section */}
            {showListings && filteredListings.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">NFT Listings</h2>
                  <Badge variant="secondary">{filteredListings.length}</Badge>
                  {verifiedOnly && (
                    <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30">
                      <Shield className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredListings.map((listing) => (
                    <Card 
                      key={listing.id} 
                      className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedListing(listing)}
                    >
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        {listing.nft.image_url ? (
                          <img
                            src={listing.nft.image_url}
                            alt={listing.nft.name || `Token #${listing.nft.token_id}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge 
                          variant="outline" 
                          className="absolute top-3 right-3 bg-green-500/20 text-green-400 border-green-500/30"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          For Sale
                        </Badge>
                        {/* LilyPad Verification */}
                        <div className="absolute top-3 left-3">
                          <LilyPadVerificationBadge 
                            contractAddress={listing.nft.collection?.contract_address} 
                            size="sm"
                          />
                        </div>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg truncate">
                          {listing.nft.name || `Token #${listing.nft.token_id}`}
                        </CardTitle>
                        {listing.nft.collection && (
                          <CardDescription>{listing.nft.collection.name}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Price</span>
                          <span className="font-bold text-lg">{listing.price} {listing.currency}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Seller</span>
                          <span className="font-mono text-xs">
                            {listing.seller_address.slice(0, 6)}...{listing.seller_address.slice(-4)}
                          </span>
                        </div>
                        <Button className="w-full mt-3" size="sm">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Buy Now
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}


            {/* Collections Section */}
            {showCollections && filteredCollections.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Rocket className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Collections</h2>
                  <Badge variant="secondary">{filteredCollections.length}</Badge>
                  {verifiedOnly && (
                    <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30">
                      <Shield className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCollections.map((collection) => {
                    const StatusIcon = statusIcons[collection.status as keyof typeof statusIcons] || Sparkles;
                    // Check if collection is "new" (live and created within last 7 days)
                    const isNew = collection.status === 'live' && 
                      new Date(collection.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
                    // Check if collection is "hot" (3+ mints in last 24 hours)
                    const hotMintCount = hotCollectionMints.get(collection.id);
                    const isHot = !!hotMintCount;
                    // Check if collection is sold out
                    const isSoldOut = collection.total_supply > 0 && collection.minted >= collection.total_supply;
                    // Determine which special badge to show (priority: Sold Out > Hot > New)
                    const showSoldOutBadge = isSoldOut;
                    const showHotBadge = isHot && !isSoldOut;
                    const showNewBadge = isNew && !isHot && !isSoldOut;
                    const hasSpecialBadge = showSoldOutBadge || showHotBadge || showNewBadge;
                    return (
                      <Card 
                        key={collection.id} 
                        className={`overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group ${showSoldOutBadge ? 'ring-2 ring-gray-500/50' : showHotBadge ? 'ring-2 ring-pink-500/50' : isNew ? 'ring-2 ring-orange-500/50' : ''}`}
                        onClick={() => navigate(`/launchpad/${collection.id}`)}
                      >
                        <div className="aspect-square relative overflow-hidden bg-muted">
                          {collection.image_url ? (
                            <img
                              src={collection.image_url}
                              alt={collection.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Rocket className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          {/* Sold Out badge */}
                          {showSoldOutBadge && (
                            <Badge 
                              className="absolute top-3 left-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white border-0 shadow-lg"
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Sold Out
                            </Badge>
                          )}
                          {/* Hot badge for high mint activity */}
                          {showHotBadge && (
                            <Badge 
                              className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 animate-pulse shadow-lg"
                            >
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Hot 🔥 {hotMintCount} mints
                            </Badge>
                          )}
                          {/* New badge for recently launched live collections */}
                          {showNewBadge && (
                            <Badge 
                              className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 animate-pulse shadow-lg"
                            >
                              <Flame className="w-3 h-3 mr-1" />
                              New
                            </Badge>
                          )}
                          {/* LilyPad Verification - show below special badge or in top-left if no special badge */}
                          {collection.contract_address && (
                            <div className={`absolute ${hasSpecialBadge ? 'bottom-3 left-3' : 'top-3 left-3'}`}>
                              <LilyPadVerificationBadge 
                                contractAddress={collection.contract_address} 
                                size="sm"
                              />
                            </div>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`absolute top-3 right-3 ${statusColors[collection.status as keyof typeof statusColors] || statusColors.upcoming}`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
                          </Badge>
                        </div>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg truncate">{collection.name}</CardTitle>
                          <CardDescription>by {collection.creator_address.slice(0, 6)}...{collection.creator_address.slice(-4)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Price</span>
                            <span className="font-medium">{getPrice(collection)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Supply</span>
                            <span className="font-medium">{collection.minted} / {collection.total_supply}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-muted rounded-full h-1.5 mt-3">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${collection.total_supply > 0 ? (collection.minted / collection.total_supply) * 100 : 0}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Sticker Packs Section */}
            {showStickers && stickerPacks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Sticker className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Sticker Packs</h2>
                  <Badge variant="secondary">{stickerPacks.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {stickerPacks.map((pack) => (
                    <Card 
                      key={pack.id} 
                      className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/marketplace/sticker/${pack.id}`)}
                    >
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        {pack.image_url ? (
                          <img
                            src={pack.image_url}
                            alt={pack.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <Sticker className="w-12 h-12 text-primary" />
                          </div>
                        )}
                        <Badge 
                          variant="outline" 
                          className="absolute top-3 right-3 bg-primary/20 text-primary border-primary/30"
                        >
                          {pack.tier}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg truncate">{pack.name}</CardTitle>
                        {pack.description && (
                          <CardDescription className="line-clamp-2">{pack.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Price</span>
                          <span className="font-medium">{pack.price_mon > 0 ? `${pack.price_mon} MON` : "Free"}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sales</span>
                          <span className="font-medium">{pack.total_sales}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {!isLoading && collections.length === 0 && stickerPacks.length === 0 && nftListings.length === 0 && (
              <div className="text-center py-12">
                <LilyPadLogo size={48} className="mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No items found</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to create something!
                </p>
                <Button onClick={() => navigate("/launchpad")}>
                  Launch Collection
                </Button>
              </div>
            )}

            {/* Filtered Empty States */}
            {!isLoading && activeFilter === "listings" && nftListings.length === 0 && (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No NFT listings yet</h3>
                <p className="text-muted-foreground mb-4">
                  List your NFTs for sale from My NFTs page.
                </p>
                <Button onClick={() => navigate("/my-nfts")}>
                  View My NFTs
                </Button>
              </div>
            )}

            {!isLoading && activeFilter === "collections" && collections.length === 0 && (
              <div className="text-center py-12">
                <Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No collections yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to launch a collection!
                </p>
                <Button onClick={() => navigate("/launchpad")}>
                  Launch Collection
                </Button>
              </div>
            )}

            {!isLoading && activeFilter === "stickers" && stickerPacks.length === 0 && (
              <div className="text-center py-12">
                <Sticker className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No sticker packs yet</h3>
                <p className="text-muted-foreground">
                  Sticker packs will appear here when creators add them.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Buy NFT Modal */}
      <BuyNFTModal
        listing={selectedListing}
        open={!!selectedListing}
        onOpenChange={(open) => !open && setSelectedListing(null)}
        onSuccess={() => {
          setSelectedListing(null);
          fetchData();
        }}
      />
    </div>
  );
}