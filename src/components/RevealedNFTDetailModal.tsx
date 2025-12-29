import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Clock, Hash, Layers, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

interface NFTAttribute {
  trait_type: string;
  value: string;
  rarity?: number;
}

interface RevealedNFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: {
    id: string;
    token_id: number;
    name: string | null;
    image_url: string | null;
    revealed_at: string;
    attributes: NFTAttribute[] | null;
  } | null;
  collectionName?: string;
}

const getRarityColor = (rarity: number): string => {
  if (rarity <= 5) return "bg-amber-500/20 text-amber-500 border-amber-500/30";
  if (rarity <= 15) return "bg-purple-500/20 text-purple-500 border-purple-500/30";
  if (rarity <= 30) return "bg-blue-500/20 text-blue-500 border-blue-500/30";
  if (rarity <= 50) return "bg-green-500/20 text-green-500 border-green-500/30";
  return "bg-muted text-muted-foreground border-border";
};

const getRarityLabel = (rarity: number): string => {
  if (rarity <= 5) return "Legendary";
  if (rarity <= 15) return "Epic";
  if (rarity <= 30) return "Rare";
  if (rarity <= 50) return "Uncommon";
  return "Common";
};

export const RevealedNFTDetailModal: React.FC<RevealedNFTDetailModalProps> = ({
  isOpen,
  onClose,
  nft,
  collectionName,
}) => {
  if (!nft) return null;

  const sortedAttributes = nft.attributes
    ? [...nft.attributes].sort((a, b) => (a.rarity || 100) - (b.rarity || 100))
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {nft.name || `Token #${nft.token_id}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* NFT Image */}
          <div className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/50">
            {nft.image_url ? (
              <img
                src={nft.image_url}
                alt={nft.name || `#${nft.token_id}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            
            {/* Token ID Badge */}
            <Badge 
              className="absolute top-3 right-3 bg-black/70 text-white border-none"
            >
              <Hash className="w-3 h-3 mr-1" />
              {nft.token_id}
            </Badge>
          </div>

          {/* Meta Info */}
          <div className="flex items-center justify-between text-sm">
            {collectionName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Layers className="w-4 h-4" />
                <span>{collectionName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Revealed {format(new Date(nft.revealed_at), "MMM d, yyyy")}</span>
            </div>
          </div>

          <Separator />

          {/* Traits Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Traits
              {sortedAttributes.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {sortedAttributes.length}
                </Badge>
              )}
            </h3>

            {sortedAttributes.length > 0 ? (
              <ScrollArea className="h-[200px] pr-4">
                <div className="grid grid-cols-2 gap-2">
                  {sortedAttributes.map((attr, index) => {
                    const rarity = attr.rarity || 100;
                    const rarityColor = getRarityColor(rarity);
                    const rarityLabel = getRarityLabel(rarity);

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${rarityColor} transition-all hover:scale-[1.02]`}
                      >
                        <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                          {attr.trait_type}
                        </p>
                        <p className="text-sm font-medium truncate" title={attr.value}>
                          {attr.value}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] font-medium">
                            {rarityLabel}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {rarity.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No traits available</p>
              </div>
            )}
          </div>

          {/* Rarity Legend */}
          {sortedAttributes.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { label: "Legendary", color: "bg-amber-500" },
                  { label: "Epic", color: "bg-purple-500" },
                  { label: "Rare", color: "bg-blue-500" },
                  { label: "Uncommon", color: "bg-green-500" },
                  { label: "Common", color: "bg-muted-foreground" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RevealedNFTDetailModal;
