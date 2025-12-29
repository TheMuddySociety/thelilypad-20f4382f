import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Sparkles, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  Image as ImageIcon,
  Wand2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NFTRevealAnimation } from "./NFTRevealAnimation";

interface MintedNFT {
  id: string;
  token_id: number;
  name: string | null;
  image_url: string | null;
  is_revealed: boolean;
  revealed_at: string | null;
}

interface RevealManagerProps {
  collectionId: string;
  collectionName: string;
  unrevealedImageUrl: string | null;
  isCollectionRevealed: boolean;
  onRevealComplete: () => void;
}

export function RevealManager({
  collectionId,
  collectionName,
  unrevealedImageUrl,
  isCollectionRevealed,
  onRevealComplete,
}: RevealManagerProps) {
  const [nfts, setNfts] = useState<MintedNFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevealing, setIsRevealing] = useState(false);
  const [selectedNfts, setSelectedNfts] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [revealedNftsForAnimation, setRevealedNftsForAnimation] = useState<MintedNFT[]>([]);
  const [revealMode, setRevealMode] = useState<"all" | "selected">("all");

  useEffect(() => {
    fetchNFTs();
  }, [collectionId]);

  const fetchNFTs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("minted_nfts")
      .select("id, token_id, name, image_url, is_revealed, revealed_at")
      .eq("collection_id", collectionId)
      .order("token_id", { ascending: true });

    if (!error && data) {
      setNfts(data);
    }
    setIsLoading(false);
  };

  const unrevealedCount = nfts.filter(nft => !nft.is_revealed).length;
  const revealedCount = nfts.filter(nft => nft.is_revealed).length;
  const totalCount = nfts.length;

  const handleSelectNft = (nftId: string) => {
    setSelectedNfts(prev => {
      const updated = new Set(prev);
      if (updated.has(nftId)) {
        updated.delete(nftId);
      } else {
        updated.add(nftId);
      }
      return updated;
    });
  };

  const handleSelectAllUnrevealed = () => {
    const unrevealedIds = nfts.filter(nft => !nft.is_revealed).map(nft => nft.id);
    setSelectedNfts(new Set(unrevealedIds));
  };

  const handleDeselectAll = () => {
    setSelectedNfts(new Set());
  };

  const handleRevealAll = () => {
    setRevealMode("all");
    setShowConfirmDialog(true);
  };

  const handleRevealSelected = () => {
    if (selectedNfts.size === 0) {
      toast.error("Please select at least one NFT to reveal");
      return;
    }
    setRevealMode("selected");
    setShowConfirmDialog(true);
  };

  const executeReveal = async () => {
    setIsRevealing(true);
    setShowConfirmDialog(false);

    try {
      const now = new Date().toISOString();
      let nftsToAnimate: MintedNFT[] = [];
      
      if (revealMode === "all") {
        // Get the NFTs that will be revealed for animation
        nftsToAnimate = nfts.filter(nft => !nft.is_revealed);
        
        // Reveal all unrevealed NFTs
        const { error: nftError } = await supabase
          .from("minted_nfts")
          .update({ is_revealed: true, revealed_at: now })
          .eq("collection_id", collectionId)
          .eq("is_revealed", false);

        if (nftError) throw nftError;

        // Mark collection as revealed
        const { error: collectionError } = await supabase
          .from("collections")
          .update({ is_revealed: true })
          .eq("id", collectionId);

        if (collectionError) throw collectionError;
      } else {
        // Get the NFTs that will be revealed for animation
        nftsToAnimate = nfts.filter(nft => selectedNfts.has(nft.id));
        
        // Reveal only selected NFTs
        const { error } = await supabase
          .from("minted_nfts")
          .update({ is_revealed: true, revealed_at: now })
          .in("id", Array.from(selectedNfts));

        if (error) throw error;

        // Check if all NFTs are now revealed
        const remainingUnrevealed = nfts.filter(
          nft => !nft.is_revealed && !selectedNfts.has(nft.id)
        ).length;

        if (remainingUnrevealed === 0) {
          await supabase
            .from("collections")
            .update({ is_revealed: true })
            .eq("id", collectionId);
        }

        setSelectedNfts(new Set());
      }

      // Show reveal animation
      if (nftsToAnimate.length > 0) {
        setRevealedNftsForAnimation(nftsToAnimate);
        setShowRevealAnimation(true);
      }

      await fetchNFTs();
      onRevealComplete();
    } catch (error) {
      console.error("Error revealing NFTs:", error);
      toast.error("Failed to reveal NFTs. Please try again.");
    } finally {
      setIsRevealing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Reveal Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Reveal Manager
          </CardTitle>
          <CardDescription>
            Reveal your collection's NFTs to show their final artwork
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No NFTs have been minted yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              NFTs will appear here after they are minted
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Reveal Manager
              </CardTitle>
              <CardDescription className="mt-1">
                Reveal your collection's NFTs to show their final artwork
              </CardDescription>
            </div>
            {isCollectionRevealed && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Collection Revealed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Minted</p>
            </div>
            <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
              <p className="text-2xl font-bold text-emerald-500">{revealedCount}</p>
              <p className="text-xs text-muted-foreground">Revealed</p>
            </div>
            <div className="text-center p-4 bg-amber-500/10 rounded-lg">
              <p className="text-2xl font-bold text-amber-500">{unrevealedCount}</p>
              <p className="text-xs text-muted-foreground">Unrevealed</p>
            </div>
          </div>

          {/* Unrevealed Image Preview */}
          {unrevealedImageUrl && unrevealedCount > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0">
                <img 
                  src={unrevealedImageUrl} 
                  alt="Unrevealed placeholder" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium text-sm">Unrevealed Image</p>
                <p className="text-xs text-muted-foreground">
                  This image is shown to collectors before reveal
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          {unrevealedCount > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleRevealAll}
                disabled={isRevealing}
                className="flex-1 sm:flex-none"
              >
                {isRevealing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Reveal All ({unrevealedCount})
              </Button>
              <Button
                variant="outline"
                onClick={handleRevealSelected}
                disabled={isRevealing || selectedNfts.size === 0}
                className="flex-1 sm:flex-none"
              >
                <Eye className="w-4 h-4 mr-2" />
                Reveal Selected ({selectedNfts.size})
              </Button>
            </div>
          )}

          {/* NFT Selection Grid */}
          {unrevealedCount > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Select NFTs to Reveal</p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllUnrevealed}
                    disabled={selectedNfts.size === unrevealedCount}
                  >
                    Select All Unrevealed
                  </Button>
                  {selectedNfts.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                    >
                      Deselect All
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg p-3">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {nfts.map((nft) => (
                    <div
                      key={nft.id}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        nft.is_revealed 
                          ? "border-emerald-500/50 opacity-60" 
                          : selectedNfts.has(nft.id)
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => !nft.is_revealed && handleSelectNft(nft.id)}
                    >
                      <img
                        src={nft.is_revealed ? nft.image_url || unrevealedImageUrl : unrevealedImageUrl || nft.image_url}
                        alt={nft.name || `#${nft.token_id}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Selection Checkbox */}
                      {!nft.is_revealed && (
                        <div className="absolute top-1 left-1">
                          <Checkbox
                            checked={selectedNfts.has(nft.id)}
                            onCheckedChange={() => handleSelectNft(nft.id)}
                            className="bg-background/80"
                          />
                        </div>
                      )}

                      {/* Revealed Badge */}
                      {nft.is_revealed && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <Eye className="w-4 h-4 text-emerald-500" />
                        </div>
                      )}

                      {/* Token ID */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                        <p className="text-[10px] text-white text-center">
                          #{nft.token_id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* All Revealed State */}
          {unrevealedCount === 0 && totalCount > 0 && (
            <div className="text-center py-8 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
              <p className="font-medium text-emerald-500">All NFTs Revealed!</p>
              <p className="text-sm text-muted-foreground mt-1">
                All {totalCount} NFTs in this collection have been revealed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Reveal</AlertDialogTitle>
            <AlertDialogDescription>
              {revealMode === "all" ? (
                <>
                  You are about to reveal <strong>all {unrevealedCount} unrevealed NFTs</strong> in {collectionName}.
                  This action cannot be undone. The final artwork will be visible to all collectors.
                </>
              ) : (
                <>
                  You are about to reveal <strong>{selectedNfts.size} selected NFT(s)</strong> in {collectionName}.
                  This action cannot be undone. The final artwork will be visible to all collectors.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeReveal}>
              <Sparkles className="w-4 h-4 mr-2" />
              Reveal NFTs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reveal Animation */}
      <NFTRevealAnimation
        open={showRevealAnimation}
        onOpenChange={setShowRevealAnimation}
        nfts={revealedNftsForAnimation}
        unrevealedImage={unrevealedImageUrl}
        collectionName={collectionName}
      />
    </>
  );
}
