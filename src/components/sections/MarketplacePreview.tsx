import React from "react";
import { Button } from "@/components/ui/button";
import { Radio, TrendingUp, Sparkles, Gift, Play } from "lucide-react";

const filters = [
  { label: "Trending", icon: TrendingUp, active: true },
  { label: "New", icon: Sparkles },
  { label: "Auctions", icon: TrendingUp },
  { label: "Blind Boxes", icon: Gift },
  { label: "Livestreaming", icon: Radio },
];

const collections = [
  {
    name: "Monad Apes",
    creator: "MonadLabs",
    floor: "2.5 MON",
    volume: "1.2K MON",
    isLive: true,
    image: "🦍",
  },
  {
    name: "Lily Frogs",
    creator: "TheLilyPad",
    floor: "1.8 MON",
    volume: "890 MON",
    isLive: false,
    image: "🐸",
  },
  {
    name: "Pad Punks",
    creator: "CryptoArtist",
    floor: "3.2 MON",
    volume: "2.1K MON",
    isLive: true,
    image: "👾",
  },
  {
    name: "Sacred Gems",
    creator: "GemMaster",
    floor: "0.8 MON",
    volume: "450 MON",
    isLive: false,
    image: "💎",
  },
  {
    name: "Neon Cats",
    creator: "NeonStudio",
    floor: "1.5 MON",
    volume: "780 MON",
    isLive: false,
    image: "🐱",
  },
  {
    name: "Abstract Realms",
    creator: "AbstractArt",
    floor: "4.0 MON",
    volume: "3.5K MON",
    isLive: true,
    image: "🎨",
  },
];

export const MarketplacePreview: React.FC = () => {
  return (
    <section className="py-24 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/5 to-transparent" />
      
      <div className="container mx-auto px-6 relative">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Explore the <span className="gradient-text">Marketplace</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover, collect, and trade premium NFT collections on Monad.
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {filters.map((filter) => (
            <button
              key={filter.label}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                filter.active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <filter.icon className="w-4 h-4" />
              {filter.label}
            </button>
          ))}
        </div>
        
        {/* Collections grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <div
              key={collection.name}
              className="group glass-card overflow-hidden hover:border-primary/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 cursor-pointer"
            >
              {/* Image area */}
              <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative overflow-hidden">
                <span className="text-8xl group-hover:scale-110 transition-transform duration-500">
                  {collection.image}
                </span>
                
                {/* Live badge */}
                {collection.isLive && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-xs font-semibold">
                    <Play className="w-3 h-3 fill-current" />
                    LIVE
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              
              {/* Info */}
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                      {collection.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">by {collection.creator}</p>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-muted-foreground">Floor</span>
                    <p className="font-semibold text-primary">{collection.floor}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">Volume</span>
                    <p className="font-semibold">{collection.volume}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="group">
            Explore All Collections
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};
