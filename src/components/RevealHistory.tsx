import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Sparkles, Clock, Image as ImageIcon } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface RevealedNFT {
  id: string;
  token_id: number;
  name: string | null;
  image_url: string | null;
  revealed_at: string;
  attributes: Array<{ trait_type: string; value: string }> | null;
}

interface RevealHistoryProps {
  collectionId: string;
}

export const RevealHistory: React.FC<RevealHistoryProps> = ({ collectionId }) => {
  const [revealedNfts, setRevealedNfts] = useState<RevealedNFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRevealedNfts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("minted_nfts")
        .select("id, token_id, name, image_url, revealed_at, attributes")
        .eq("collection_id", collectionId)
        .eq("is_revealed", true)
        .not("revealed_at", "is", null)
        .order("revealed_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching reveal history:", error);
      } else {
        const typedData = (data || []).map(item => ({
          ...item,
          attributes: item.attributes as Array<{ trait_type: string; value: string }> | null
        }));
        setRevealedNfts(typedData);
      }
      setIsLoading(false);
    };

    fetchRevealedNfts();
  }, [collectionId]);

  // Group NFTs by reveal date
  const groupedByDate = revealedNfts.reduce((acc, nft) => {
    const dateKey = format(new Date(nft.revealed_at), "yyyy-MM-dd HH:mm");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(nft);
    return acc;
  }, {} as Record<string, RevealedNFT[]>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Reveal History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="w-16 h-16 rounded-lg" />
                <Skeleton className="w-16 h-16 rounded-lg" />
                <Skeleton className="w-16 h-16 rounded-lg" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (revealedNfts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Reveal History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Sparkles className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No NFTs have been revealed yet</p>
            <p className="text-xs mt-1">Revealed NFTs will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Reveal History
          <Badge variant="secondary" className="ml-auto">
            {revealedNfts.length} Revealed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([dateKey, nfts]) => {
              const revealDate = new Date(nfts[0].revealed_at);
              return (
                <div key={dateKey} className="space-y-3">
                  {/* Date Header */}
                  <div className="flex items-center gap-2 sticky top-0 bg-card py-2 z-10">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {format(revealDate, "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatDistanceToNow(revealDate, { addSuffix: true })})
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {nfts.length} NFT{nfts.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* NFT Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {nfts.map((nft) => (
                      <div
                        key={nft.id}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/50 hover:border-primary/50 transition-all cursor-pointer"
                      >
                        {nft.image_url ? (
                          <img
                            src={nft.image_url}
                            alt={nft.name || `#${nft.token_id}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5">
                          <p className="text-[10px] font-medium text-white truncate">
                            {nft.name || `#${nft.token_id}`}
                          </p>
                          {nft.attributes && nft.attributes.length > 0 && (
                            <p className="text-[9px] text-white/70 truncate">
                              {nft.attributes.length} traits
                            </p>
                          )}
                        </div>

                        {/* Token ID Badge */}
                        <div className="absolute top-1 right-1">
                          <Badge 
                            variant="secondary" 
                            className="text-[9px] px-1 py-0 h-4 bg-black/60 text-white border-none"
                          >
                            #{nft.token_id}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RevealHistory;
