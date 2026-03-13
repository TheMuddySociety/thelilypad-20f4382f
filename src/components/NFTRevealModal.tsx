import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ExternalLink, Share2, X, ChevronLeft, ChevronRight } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

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
    const duration = 2500;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 60 * (timeLeft / duration);

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

  const getRarityColor = (rarity?: number) => {
    if (!rarity) return "border-border bg-muted/30";
    if (rarity <= 1) return "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    if (rarity <= 5) return "border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400";
    if (rarity <= 15) return "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    if (rarity <= 30) return "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400";
    return "border-border bg-muted/30";
  };

  if (!currentNft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] p-0 overflow-hidden bg-transparent border-none shadow-none sm:rounded-[2.5rem]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-card/95 backdrop-blur-2xl border border-primary/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-6 top-6 z-50 rounded-full hover:bg-muted/50"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="relative z-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-1">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-tighter"
              >
                <Sparkles className="w-3 h-3" />
                {revealPhase === "complete" ? "Item Acquired" : "Summoning..."}
              </motion.div>
              <h2 className="text-2xl font-black tracking-tight mt-2">{collectionName}</h2>
              {nfts.length > 1 && (
                <p className="text-xs text-muted-foreground font-mono">
                  COLLECTIBLE {currentNftIndex + 1} OF {nfts.length}
                </p>
              )}
            </div>

            {/* 3D Card Visual */}
            <div className="perspective-1000 py-4 flex justify-center">
              <motion.div
                key={currentNftIndex}
                animate={{
                  rotateY: revealPhase === "loading" ? 0 : 180,
                  rotateZ: revealPhase === "loading" ? [0, 2, -2, 0] : 0
                }}
                transition={{
                  rotateY: { type: "spring", stiffness: 100, damping: 20 },
                  rotateZ: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className="relative w-64 h-80 transform-style-3d cursor-pointer"
                onClick={() => {
                  if (revealPhase === "complete" && nfts.length > 1) {
                    const next = (currentNftIndex + 1) % nfts.length;
                    setCurrentNftIndex(next);
                    setRevealPhase("loading");
                    setRevealedTraitIndex(-1);
                  }
                }}
              >
                {/* Card Front (Back of card/Pack) */}
                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-primary via-primary/80 to-accent rounded-3xl shadow-2xl border-2 border-white/20 flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)]" />
                  <Sparkles className="w-16 h-16 text-white animate-pulse mb-4" />
                  <div className="text-white font-black italic text-xl tracking-tighter">THE LILY PAD</div>
                  <div className="absolute bottom-6 px-4 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] text-white font-bold tracking-widest uppercase border border-white/10">
                    Premium Collectible
                  </div>
                </div>

                {/* Card Back (Actual NFT) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-muted rounded-3xl shadow-2xl border-2 border-primary/20 overflow-hidden">
                  {currentNft.image ? (
                    <img
                      src={currentNft.image}
                      alt={currentNft.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Sparkles className="w-12 h-12 text-primary/30" />
                    </div>
                  )}

                  {/* Shiny overlay */}
                  <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 w-[50%] h-[200%] top-0 left-0 bg-white/30 blur-3xl animate-shiny pointer-events-none" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Content & Attributes */}
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <motion.h3
                  animate={{ opacity: revealPhase === "loading" ? 0.5 : 1 }}
                  className="text-xl font-bold"
                >
                  {revealPhase === "loading" ? "Identifying Metadata..." : currentNft.name}
                </motion.h3>
                <Badge variant="outline" className="border-primary/20 text-[10px] font-mono tracking-widest uppercase">
                  #{currentNft.tokenId}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Properties</span>
                  <span className="text-[10px] font-mono text-primary/70">{currentNft.attributes.length} TOTAL</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {currentNft.attributes.map((attr, index) => {
                    const isRevealed = revealedTraitIndex >= index;
                    return (
                      <motion.div
                        key={`${attr.trait_type}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: isRevealed ? 1 : 0.1, y: isRevealed ? 0 : 10 }}
                        className={`p-3 rounded-2xl border transition-all duration-300 ${getRarityColor(attr.rarity)}`}
                      >
                        <p className="text-[9px] font-bold uppercase opacity-60 mb-0.5">{attr.trait_type}</p>
                        <p className="font-extrabold text-sm truncate">{attr.value}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <AnimatePresence>
              {revealPhase === "complete" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-4 space-y-4"
                >
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        const finalUrl = explorerUrl?.includes(txHash)
                          ? explorerUrl
                          : `${explorerUrl}/tx/${txHash}`;
                        window.open(finalUrl, "_blank");
                      }}
                      variant="outline"
                      className="flex-1 rounded-2xl h-12 border-primary/20 hover:bg-primary/5 font-bold"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Explorer
                    </Button>
                    <Button
                      onClick={() => {
                        const url = window.location.href;
                        navigator.clipboard.writeText(`I just minted a legendary ${collectionName} NFT on The Lily Pad! ${url}`);
                        toast.success("Share text copied!");
                      }}
                      variant="outline"
                      className="flex-1 rounded-2xl h-12 border-primary/20 hover:bg-primary/5 font-bold"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    {nfts.length > 1 && (
                      <div className="flex gap-2 flex-grow">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl h-12 w-12 border border-primary/10"
                          onClick={() => {
                            setCurrentNftIndex(prev => Math.max(0, prev - 1));
                            setRevealPhase("loading");
                            setRevealedTraitIndex(-1);
                          }}
                          disabled={currentNftIndex === 0}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl h-12 w-12 border border-primary/10"
                          onClick={() => {
                            setCurrentNftIndex(prev => Math.min(nfts.length - 1, prev + 1));
                            setRevealPhase("loading");
                            setRevealedTraitIndex(-1);
                          }}
                          disabled={currentNftIndex === nfts.length - 1}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    )}
                    <Button
                      onClick={() => onOpenChange(false)}
                      className="flex-grow rounded-2xl h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg"
                    >
                      Done
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
