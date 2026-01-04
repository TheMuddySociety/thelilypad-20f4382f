import React, { useState, useCallback, useMemo, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BuyNFTModal } from "@/components/BuyNFTModal";
import { NFTSalesAnalytics } from "@/components/NFTSalesAnalytics";
import BuybackStats from "@/components/BuybackStats";
import { Sparkles } from "lucide-react";
import { LilyPadLogo } from "@/components/LilyPadLogo";
import { TopCollectionsHighlights } from "@/components/sections/TopCollectionsHighlights";
import { BackToTop } from "@/components/BackToTop";
import { useWallet } from "@/providers/WalletProvider";
import { useSEO } from "@/hooks/useSEO";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { 
  useMarketplaceData, 
  isCollectionNew, 
  type NFTListing 
} from "@/hooks/useMarketplaceData";
import { 
  PageHeader, 
  StatsGrid, 
  type StatItem 
} from "@/components/common";
import {
  MarketplaceFilters,
  CollectionsGrid,
  ListingsGrid,
  StickerPacksGrid,
} from "@/components/marketplace";
import frognadBanner from "@/assets/frognad-banner.png";

export default function Marketplace() {
  const { currentChain } = useWallet();
  const [activeFilter, setActiveFilter] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showHotOnly, setShowHotOnly] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [selectedListing, setSelectedListing] = useState<NFTListing | null>(null);

  // Use the custom hook for data fetching
  const {
    collections,
    stickerPacks,
    nftListings,
    hotCollectionMints,
    totalCollections,
    isLoading,
  } = useMarketplaceData();

  // Infinite scroll for collections
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const hasMoreCollections = collections.length < totalCollections;

  useSEO({
    title: "Lily Marketplace | The Lily Pad",
    description: "Browse NFT collections, listings, and sticker packs on Lily Marketplace. Discover unique digital collectibles on Monad."
  });

  // Filter collections
  const filteredCollections = useMemo(() => {
    return collections.filter(c => {
      if (verifiedOnly && !c.contract_address) return false;
      if (showHotOnly && !hotCollectionMints.has(c.id)) return false;
      if (showNewOnly && !isCollectionNew(c)) return false;
      return true;
    });
  }, [collections, verifiedOnly, showHotOnly, showNewOnly, hotCollectionMints]);

  // Filter listings
  const filteredListings = useMemo(() => {
    return verifiedOnly
      ? nftListings.filter(l => l.nft.collection?.contract_address)
      : nftListings;
  }, [nftListings, verifiedOnly]);

  // Show flags
  const showAnalytics = activeFilter === "analytics";
  const showListings = activeFilter === "all" || activeFilter === "listings";
  const showCollections = activeFilter === "all" || activeFilter === "collections";
  const showStickers = activeFilter === "all" || activeFilter === "stickers";

  // Stats
  const stats: StatItem[] = useMemo(() => [
    { label: "NFT Listings", value: nftListings.length, loading: isLoading },
    { label: "Collections", value: totalCollections || collections.length, loading: isLoading },
    { label: "Sticker Packs", value: stickerPacks.length, loading: isLoading },
    { label: "Live Mints", value: collections.filter(c => c.status === "live").length, loading: isLoading },
    { label: "Stickers Sold", value: stickerPacks.reduce((sum, s) => sum + s.total_sales, 0), loading: isLoading },
  ], [nftListings.length, totalCollections, collections, stickerPacks, isLoading]);

  // Handlers
  const handleHotToggle = useCallback(() => {
    setShowHotOnly(prev => {
      if (!prev) setShowNewOnly(false);
      return !prev;
    });
  }, []);

  const handleNewToggle = useCallback(() => {
    setShowNewOnly(prev => {
      if (!prev) setShowHotOnly(false);
      return !prev;
    });
  }, []);

  const canLoadMore = hasMoreCollections && !verifiedOnly && !showHotOnly && !showNewOnly;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <PageHeader
          logo={<LilyPadLogo size={56} />}
          title="Lily Marketplace"
          subtitle={`Browse collections and sticker packs on ${currentChain.name}`}
        />

        {/* Platform NFT Collection Coming Soon Banner */}
        <div className="relative mb-8 rounded-xl overflow-hidden">
          <img 
            src={frognadBanner} 
            alt="The Lily Pad Frognad Collection" 
            className="w-full h-auto object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-center sm:text-left">
            <Badge className="bg-emerald-500/90 text-white border-none mb-2">
              <Sparkles className="w-3 h-3 mr-1" />
              Coming Soon
            </Badge>
            <p className="text-white font-semibold text-lg sm:text-xl drop-shadow-lg">
              The Lily Pad own platform NFT collection coming soon.
            </p>
          </div>
        </div>

        {/* Stats */}
        <StatsGrid stats={stats} columns={5} className="mb-8" />

        {/* Buyback Stats and Top Collections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <TopCollectionsHighlights />
          </div>
          <div>
            <BuybackStats />
          </div>
        </div>

        {/* Filters */}
        <MarketplaceFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          verifiedOnly={verifiedOnly}
          onVerifiedChange={setVerifiedOnly}
          showHotOnly={showHotOnly}
          onHotChange={handleHotToggle}
          showNewOnly={showNewOnly}
          onNewChange={handleNewToggle}
          hotCount={hotCollectionMints.size}
          newCount={collections.filter(c => isCollectionNew(c)).length}
          verifiedCount={filteredCollections.length}
        />

        {/* Content Sections */}
        <div className="space-y-10">
          {/* Analytics Section */}
          {showAnalytics && (
            <section>
              <NFTSalesAnalytics />
            </section>
          )}

          {/* NFT Listings Section */}
          {showListings && (
            <ListingsGrid
              listings={filteredListings}
              verifiedOnly={verifiedOnly}
              isLoading={isLoading}
              onSelectListing={setSelectedListing}
            />
          )}

          {/* Collections Section */}
          {showCollections && (
            <CollectionsGrid
              collections={filteredCollections}
              hotCollectionMints={hotCollectionMints}
              hasMore={canLoadMore}
              verifiedOnly={verifiedOnly}
              isLoading={isLoading}
              loadMoreRef={loadMoreRef}
            />
          )}

          {/* Sticker Packs Section */}
          {showStickers && (
            <StickerPacksGrid
              stickerPacks={stickerPacks}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Buy NFT Modal */}
        {selectedListing && (
          <BuyNFTModal
            open={!!selectedListing}
            onOpenChange={(open) => !open && setSelectedListing(null)}
            listing={selectedListing}
            onSuccess={() => setSelectedListing(null)}
          />
        )}
      </main>

      <BackToTop />
    </div>
  );
}
