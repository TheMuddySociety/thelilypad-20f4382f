import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, PartyPopper, ChevronLeft, ChevronRight, X, Volume2, VolumeX } from "lucide-react";
import confetti from "canvas-confetti";
import { useRevealSounds } from "@/hooks/useRevealSounds";

interface RevealedNFT {
  id: string;
  token_id: number;
  name: string | null;
  image_url: string | null;
}

interface NFTRevealAnimationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nfts: RevealedNFT[];
  unrevealedImage: string | null;
  collectionName: string;
}

export function NFTRevealAnimation({
  open,
  onOpenChange,
  nfts,
  unrevealedImage,
  collectionName,
}: NFTRevealAnimationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const hasPlayedFlipSound = useRef(false);
  
  const { 
    playFlipStart, 
    playReveal, 
    playCelebration, 
    playNavigate, 
    playSkip,
    setEnabled 
  } = useRevealSounds();

  const currentNft = nfts[currentIndex];

  useEffect(() => {
    setEnabled(soundEnabled);
  }, [soundEnabled, setEnabled]);

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setIsFlipped(false);
      setHasTriggeredConfetti(false);
      hasPlayedFlipSound.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (open && !isFlipped) {
      // Auto-flip after a short delay
      const timer = setTimeout(() => {
        if (!hasPlayedFlipSound.current) {
          playFlipStart();
          hasPlayedFlipSound.current = true;
        }
        setIsFlipped(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [open, currentIndex, playFlipStart]);

  useEffect(() => {
    if (isFlipped && !hasTriggeredConfetti) {
      // Play reveal sound slightly before confetti for better timing
      setTimeout(() => {
        playReveal();
      }, 200);
      
      setTimeout(() => {
        triggerConfetti();
        playCelebration();
      }, 400);
      
      setHasTriggeredConfetti(true);
    }
  }, [isFlipped, hasTriggeredConfetti, playReveal, playCelebration]);

  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: object) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ["#a855f7", "#6366f1", "#14b8a6"],
    });
    fire(0.2, {
      spread: 60,
      colors: ["#f59e0b", "#10b981", "#3b82f6"],
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ["#ec4899", "#8b5cf6", "#06b6d4"],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors: ["#fbbf24", "#34d399", "#60a5fa"],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ["#f472b6", "#a78bfa", "#22d3d8"],
    });
  };

  const handleNext = () => {
    if (currentIndex < nfts.length - 1) {
      playNavigate();
      setIsFlipped(false);
      setHasTriggeredConfetti(false);
      hasPlayedFlipSound.current = false;
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 100);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      playNavigate();
      setIsFlipped(false);
      setHasTriggeredConfetti(false);
      hasPlayedFlipSound.current = false;
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
      }, 100);
    }
  };

  const handleSkipAll = () => {
    playSkip();
    setCurrentIndex(nfts.length - 1);
    setIsFlipped(true);
    setHasTriggeredConfetti(true);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  if (!currentNft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-gradient-to-b from-background to-background/95 border-primary/20">
        {/* Header */}
        <div className="relative p-6 pb-0">
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              title={soundEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4"
            >
              <Sparkles className="w-8 h-8 text-primary" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold"
            >
              NFT Revealed!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-sm mt-1"
            >
              {nfts.length > 1 ? `${currentIndex + 1} of ${nfts.length} NFTs` : "Your NFT has been revealed"}
            </motion.p>
          </div>
        </div>

        {/* Card Flip Animation */}
        <div className="px-6 pb-6">
          <div className="relative w-full aspect-square max-w-[300px] mx-auto perspective-1000">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentNft.id}-${isFlipped}`}
                className="relative w-full h-full"
                initial={false}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Card Container */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    rotateY: isFlipped ? 180 : 0,
                  }}
                  transition={{
                    duration: 0.8,
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Front (Unrevealed) */}
                  <div
                    className="absolute inset-0 rounded-2xl overflow-hidden border-4 border-amber-500/50 shadow-2xl shadow-amber-500/20"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    {unrevealedImage ? (
                      <img
                        src={unrevealedImage}
                        alt="Unrevealed"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                        <Sparkles className="w-16 h-16 text-amber-500 animate-pulse" />
                      </div>
                    )}
                    {/* Shimmer Effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{
                        x: ["-100%", "200%"],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Badge className="bg-amber-500/90 text-amber-50 text-lg px-4 py-2">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Revealing...
                      </Badge>
                    </div>
                  </div>

                  {/* Back (Revealed) */}
                  <div
                    className="absolute inset-0 rounded-2xl overflow-hidden border-4 border-primary/50 shadow-2xl shadow-primary/20"
                    style={{ 
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    {currentNft.image_url ? (
                      <img
                        src={currentNft.image_url}
                        alt={currentNft.name || `#${currentNft.token_id}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <PartyPopper className="w-16 h-16 text-primary" />
                      </div>
                    )}
                    {/* Glow Effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Sparkle Particles */}
            {isFlipped && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-primary"
                    initial={{
                      x: "50%",
                      y: "50%",
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: `${50 + (Math.random() - 0.5) * 150}%`,
                      y: `${50 + (Math.random() - 0.5) * 150}%`,
                      scale: [0, 1.5, 0],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.05,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* NFT Info */}
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isFlipped ? 1 : 0, y: isFlipped ? 0 : 20 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-xl font-bold">
              {currentNft.name || `${collectionName} #${currentNft.token_id}`}
            </h3>
            <p className="text-sm text-muted-foreground">
              Token #{currentNft.token_id}
            </p>
          </motion.div>

          {/* Navigation */}
          {nfts.length > 1 && (
            <motion.div
              className="flex items-center justify-between mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              {currentIndex < nfts.length - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipAll}
                  className="text-muted-foreground"
                >
                  Skip All
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex === nfts.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* Done Button */}
          {(nfts.length === 1 || currentIndex === nfts.length - 1) && isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-4"
            >
              <Button
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                <PartyPopper className="w-4 h-4 mr-2" />
                Done
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
