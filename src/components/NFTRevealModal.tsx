import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ExternalLink, Share2, X } from "lucide-react";
import confetti from "canvas-confetti";

interface NFTAttribute {
  trait_type: string;
  value: string;
  rarity?: number;
}

interface RevealedNFT {
  tokenId: number;
  name: string;
  image: string | null;
  attributes: NFTAttribute[];
}

interface NFTRevealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nfts: RevealedNFT[];
  collectionName: string;
  txHash: string;
  explorerUrl?: string;
}

export function NFTRevealModal({
  open,
  onOpenChange,
  nfts,
  collectionName,
  txHash,
  explorerUrl
}: NFTRevealModalProps) {
  const [currentNftIndex, setCurrentNftIndex] = useState(0);
  const [revealPhase, setRevealPhase] = useState<"loading" | "image" | "traits" | "complete">("loading");
  const [revealedTraitIndex, setRevealedTraitIndex] = useState(-1);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

  const currentNft = nfts[currentNftIndex];

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCurrentNftIndex(0);
      setRevealPhase("loading");
      setRevealedTraitIndex(-1);
      setHasTriggeredConfetti(false);
    }
  }, [open]);

  // Reveal sequence
  useEffect(() => {
    if (!open || !currentNft) return;

    const runRevealSequence = async () => {
      // Loading phase
      setRevealPhase("loading");
      await delay(1500);

      // Image reveal
      setRevealPhase("image");
      await delay(1000);

      // Traits reveal - one by one
      setRevealPhase("traits");
      
      for (let i = 0; i < currentNft.attributes.length; i++) {
        await delay(400);
        setRevealedTraitIndex(i);
      }

      await delay(500);
      setRevealPhase("complete");

      // Trigger confetti on first complete reveal
      if (!hasTriggeredConfetti) {
        triggerConfetti();
        setHasTriggeredConfetti(true);
      }
    };

    runRevealSequence();
  }, [open, currentNftIndex, currentNft]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const triggerConfetti = () => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444']
      });
    }, 250);
  };

  const handleNextNft = () => {
    if (currentNftIndex < nfts.length - 1) {
      setCurrentNftIndex(prev => prev + 1);
      setRevealPhase("loading");
      setRevealedTraitIndex(-1);
    }
  };

  const handlePrevNft = () => {
    if (currentNftIndex > 0) {
      setCurrentNftIndex(prev => prev - 1);
      setRevealPhase("loading");
      setRevealedTraitIndex(-1);
    }
  };

  const getRarityColor = (rarity?: number) => {
    if (!rarity) return "border-border bg-muted";
    if (rarity <= 1) return "border-yellow-500/50 bg-yellow-500/10 text-yellow-500";
    if (rarity <= 5) return "border-purple-500/50 bg-purple-500/10 text-purple-500";
    if (rarity <= 15) return "border-blue-500/50 bg-blue-500/10 text-blue-500";
    if (rarity <= 30) return "border-green-500/50 bg-green-500/10 text-green-500";
    return "border-border bg-muted";
  };

  const getRarityLabel = (rarity?: number) => {
    if (!rarity) return null;
    if (rarity <= 1) return "Legendary";
    if (rarity <= 5) return "Epic";
    if (rarity <= 15) return "Rare";
    if (rarity <= 30) return "Uncommon";
    return null;
  };

  if (!currentNft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-gradient-to-b from-background to-muted/50 border-primary/20">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-50"
          onClick={() => onOpenChange(false)}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4"
            >
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">NFT Revealed!</span>
            </motion.div>
            
            {nfts.length > 1 && (
              <p className="text-sm text-muted-foreground">
                {currentNftIndex + 1} of {nfts.length} NFTs
              </p>
            )}
          </div>

          {/* NFT Image */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mx-auto max-w-[280px]">
            <AnimatePresence mode="wait">
              {revealPhase === "loading" ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20"
                >
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, scale: 1.2, filter: "blur(20px)" }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    filter: "blur(0px)",
                    transition: { duration: 0.8, ease: "easeOut" }
                  }}
                  className="w-full h-full"
                >
                  {currentNft.image ? (
                    <img
                      src={currentNft.image}
                      alt={currentNft.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                      <Sparkles className="w-16 h-16 text-primary/50" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shimmer overlay during loading */}
            {revealPhase === "loading" && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            )}
          </div>

          {/* NFT Name */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: revealPhase !== "loading" ? 1 : 0, 
              y: revealPhase !== "loading" ? 0 : 10 
            }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h3 className="text-xl font-bold">{currentNft.name}</h3>
            <p className="text-sm text-muted-foreground">{collectionName}</p>
          </motion.div>

          {/* Traits Reveal */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground text-center mb-3">
              Attributes
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {currentNft.attributes.map((attr, index) => {
                const isRevealed = revealedTraitIndex >= index;
                const rarityLabel = getRarityLabel(attr.rarity);

                return (
                  <motion.div
                    key={`${attr.trait_type}-${index}`}
                    initial={{ opacity: 0, scale: 0.8, rotateX: -90 }}
                    animate={{
                      opacity: isRevealed ? 1 : 0,
                      scale: isRevealed ? 1 : 0.8,
                      rotateX: isRevealed ? 0 : -90,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: 0.05
                    }}
                    className={`p-3 rounded-lg border-2 text-center ${getRarityColor(attr.rarity)}`}
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {attr.trait_type}
                    </p>
                    <p className="font-semibold text-sm truncate">{attr.value}</p>
                    {rarityLabel && (
                      <Badge 
                        variant="outline" 
                        className={`mt-1 text-[10px] ${getRarityColor(attr.rarity)}`}
                      >
                        {rarityLabel} ({attr.rarity?.toFixed(1)}%)
                      </Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: revealPhase === "complete" ? 1 : 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-2"
          >
            {/* Navigation for multiple NFTs */}
            {nfts.length > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePrevNft}
                  disabled={currentNftIndex === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleNextNft}
                  disabled={currentNftIndex === nfts.length - 1}
                >
                  Next
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              {explorerUrl && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`${explorerUrl}/tx/${txHash}`, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View TX
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(`${explorerUrl}/tx/${txHash}`);
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Shimmer animation style - add to tailwind config or use inline
const shimmerStyle = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.animate-shimmer {
  animation: shimmer 1.5s infinite;
}
`;
