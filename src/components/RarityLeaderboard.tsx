import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Crown, Medal, Award, Sparkles, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RevealedNFTDetailModal } from "@/components/RevealedNFTDetailModal";

interface NFTAttribute {
  trait_type: string;
  value: string;
  rarity?: number;
}

interface RankedNFT {
  id: string;
  token_id: number;
  name: string | null;
  image_url: string | null;
  revealed_at: string;
  attributes: NFTAttribute[] | null;
  rarityScore: number;
  rank: number;
}

interface RarityLeaderboardProps {
  collectionId: string;
  collectionName?: string;
}

const calculateRarityScore = (attributes: NFTAttribute[] | null): number => {
  if (!attributes || attributes.length === 0) return 100;
  
  // Calculate score as sum of rarities - lower = rarer
  // Also factor in the number of rare traits
  const totalRarity = attributes.reduce((sum, attr) => {
    const rarity = attr.rarity ?? 50; // Default to 50% if no rarity
    return sum + rarity;
  }, 0);
  
  return totalRarity / attributes.length;
};

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        bg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20",
        border: "border-amber-500/50",
        icon: Crown,
        iconColor: "text-amber-500",
        badge: "bg-amber-500 text-white",
      };
    case 2:
      return {
        bg: "bg-gradient-to-r from-slate-300/20 via-gray-300/20 to-slate-300/20",
        border: "border-slate-400/50",
        icon: Medal,
        iconColor: "text-slate-400",
        badge: "bg-slate-400 text-white",
      };
    case 3:
      return {
        bg: "bg-gradient-to-r from-orange-600/20 via-amber-700/20 to-orange-600/20",
        border: "border-orange-600/50",
        icon: Award,
        iconColor: "text-orange-600",
        badge: "bg-orange-600 text-white",
      };
    default:
      return {
        bg: "bg-muted/30",
        border: "border-border",
        icon: Sparkles,
        iconColor: "text-muted-foreground",
        badge: "bg-muted text-muted-foreground",
      };
  }
};

export const RarityLeaderboard: React.FC<RarityLeaderboardProps> = ({ 
  collectionId,
  collectionName 
}) => {
  const [rankedNfts, setRankedNfts] = useState<RankedNFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNft, setSelectedNft] = useState<RankedNFT | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchAndRankNfts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("minted_nfts")
        .select("id, token_id, name, image_url, revealed_at, attributes")
        .eq("collection_id", collectionId)
        .eq("is_revealed", true)
        .not("revealed_at", "is", null);

      if (error) {
        console.error("Error fetching NFTs for ranking:", error);
        setIsLoading(false);
        return;
      }

      // Calculate rarity scores and rank
      const nftsWithScores = (data || [])
        .map((nft) => {
          const attrs = Array.isArray(nft.attributes) 
            ? (nft.attributes as unknown as NFTAttribute[]) 
            : null;
          return {
            ...nft,
            attributes: attrs,
            revealed_at: nft.revealed_at || "",
            rarityScore: calculateRarityScore(attrs),
            rank: 0,
          };
        })
        .sort((a, b) => a.rarityScore - b.rarityScore) // Lower score = rarer
        .map((nft, index) => ({
          ...nft,
          rank: index + 1,
        }));

      setRankedNfts(nftsWithScores);
      setIsLoading(false);
    };

    fetchAndRankNfts();
  }, [collectionId]);

  const handleNftClick = (nft: RankedNFT) => {
    setSelectedNft(nft);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Rarity Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rankedNfts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Rarity Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Trophy className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No revealed NFTs to rank</p>
            <p className="text-xs mt-1">Rankings will appear after reveals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Rarity Leaderboard
            <Badge variant="secondary" className="ml-auto">
              {rankedNfts.length} NFTs Ranked
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px] pr-4">
            <div className="space-y-2">
              {rankedNfts.map((nft) => {
                const style = getRankStyle(nft.rank);
                const RankIcon = style.icon;
                const rarestTrait = nft.attributes
                  ?.filter(a => a.rarity !== undefined)
                  .sort((a, b) => (a.rarity || 100) - (b.rarity || 100))[0];

                return (
                  <div
                    key={nft.id}
                    onClick={() => handleNftClick(nft)}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${style.bg} ${style.border} cursor-pointer hover:scale-[1.01] transition-all`}
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-10 flex justify-center">
                      {nft.rank <= 3 ? (
                        <RankIcon className={`w-6 h-6 ${style.iconColor}`} />
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          #{nft.rank}
                        </span>
                      )}
                    </div>

                    {/* NFT Image */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-border bg-muted">
                      {nft.image_url ? (
                        <img
                          src={nft.image_url}
                          alt={nft.name || `#${nft.token_id}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* NFT Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {nft.name || `Token #${nft.token_id}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>#{nft.token_id}</span>
                        {rarestTrait && (
                          <>
                            <span>•</span>
                            <span className="text-primary">
                              {rarestTrait.trait_type}: {rarestTrait.value} ({rarestTrait.rarity?.toFixed(1)}%)
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rarity Score */}
                    <div className="flex-shrink-0 text-right">
                      <Badge className={style.badge}>
                        {nft.rarityScore.toFixed(1)}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Avg Rarity
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Lower rarity score = rarer NFT • Score based on average trait rarity
            </p>
          </div>
        </CardContent>
      </Card>

      <RevealedNFTDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedNft(null);
        }}
        nft={selectedNft}
        collectionName={collectionName}
      />
    </>
  );
};

export default RarityLeaderboard;
