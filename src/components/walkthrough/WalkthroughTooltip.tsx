import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WalkthroughStep } from "@/hooks/useLaunchpadWalkthrough";
import { useWalkthroughSounds } from "@/hooks/useWalkthroughSounds";

interface WalkthroughTooltipProps {
  step: WalkthroughStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

interface Position {
  top: number;
  left: number;
  arrowPosition: "top" | "bottom" | "left" | "right";
}

export function WalkthroughTooltip({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: WalkthroughTooltipProps) {
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, arrowPosition: "top" });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(currentIndex);
  const { playStep, playBack, playSkip, setEnabled, isEnabled } = useWalkthroughSounds();

  // Detect step changes for transition animation and play sound
  useEffect(() => {
    if (prevStepRef.current !== currentIndex) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      
      // Play appropriate sound based on direction
      if (currentIndex > prevStepRef.current) {
        playStep();
      } else {
        playBack();
      }
      
      prevStepRef.current = currentIndex;
      return () => clearTimeout(timer);
    }
  }, [currentIndex, playStep, playBack]);

  const handleToggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setEnabled(newState);
  };

  const handleSkip = () => {
    playSkip();
    onSkip();
  };

  useEffect(() => {
    const updatePosition = () => {
      const target = document.querySelector(step.target);
      if (!target || !tooltipRef.current) return;

      const rect = target.getBoundingClientRect();
      setTargetRect(rect);
      
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const padding = step.spotlightPadding || 8;
      const offset = 16;

      let top = 0;
      let left = 0;
      let arrowPosition: "top" | "bottom" | "left" | "right" = "top";

      const placement = step.placement || "bottom";

      switch (placement) {
        case "bottom":
          top = rect.bottom + padding + offset;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          arrowPosition = "top";
          break;
        case "top":
          top = rect.top - padding - offset - tooltipRect.height;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          arrowPosition = "bottom";
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.left - padding - offset - tooltipRect.width;
          arrowPosition = "right";
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.right + padding + offset;
          arrowPosition = "left";
          break;
      }

      // Keep tooltip within viewport
      const viewportPadding = 16;
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding));
      top = Math.max(viewportPadding, Math.min(top, window.innerHeight - tooltipRect.height - viewportPadding));

      setPosition({ top, left, arrowPosition });
    };

    // Initial positioning
    const timer = setTimeout(updatePosition, 50);

    // Reposition on scroll/resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [step]);

  // Scroll target into view
  useEffect(() => {
    const target = document.querySelector(step.target);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step.target]);

  const progressPercentage = ((currentIndex + 1) / totalSteps) * 100;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ 
          duration: 0.3, 
          ease: [0.4, 0, 0.2, 1],
          scale: { type: "spring", stiffness: 300, damping: 25 }
        }}
        className="fixed z-[10001] w-80 max-w-[calc(100vw-32px)]"
        style={{ top: position.top, left: position.left }}
      >
        {/* Arrow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`absolute w-3 h-3 bg-card border rotate-45 ${
            position.arrowPosition === "top"
              ? "-top-1.5 left-1/2 -translate-x-1/2 border-t border-l"
              : position.arrowPosition === "bottom"
              ? "-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r"
              : position.arrowPosition === "left"
              ? "-left-1.5 top-1/2 -translate-y-1/2 border-l border-b"
              : "-right-1.5 top-1/2 -translate-y-1/2 border-r border-t"
          }`}
        />

        {/* Tooltip content */}
        <div className="bg-card border rounded-lg shadow-xl overflow-hidden">
          {/* Progress bar at top */}
          <div className="h-1 bg-muted relative overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80"
              initial={{ width: `${((currentIndex) / totalSteps) * 100}%` }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ left: "-20%" }}
              animate={{ left: "120%" }}
              transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2">
            <motion.h3 
              className="font-semibold text-foreground"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {step.title}
            </motion.h3>
            <div className="flex items-center gap-1">
              {/* Sound toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleToggleSound}
                title={soundEnabled ? "Mute sounds" : "Enable sounds"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2"
                onClick={handleSkip}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <motion.p 
            className="px-4 pb-4 text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {step.description}
          </motion.p>

          {/* Footer */}
          <motion.div 
            className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            {/* Step counter with animated dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{
                    scale: i === currentIndex ? 1.2 : 1,
                    backgroundColor: i === currentIndex 
                      ? "hsl(var(--primary))" 
                      : i < currentIndex 
                      ? "hsl(var(--primary) / 0.5)" 
                      : "hsl(var(--muted-foreground) / 0.3)"
                  }}
                  transition={{ 
                    duration: 0.3,
                    scale: { type: "spring", stiffness: 400, damping: 20 }
                  }}
                  className="w-2 h-2 rounded-full"
                />
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                {currentIndex + 1}/{totalSteps}
              </span>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button variant="ghost" size="sm" onClick={onPrev}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button size="sm" onClick={onNext} className="relative overflow-hidden group">
                  <span className="relative z-10">
                    {isLast ? (
                      "Got it!"
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1 inline-block group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                  {/* Button hover effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Spotlight overlay */}
      {targetRect && (
        <SpotlightOverlay 
          rect={targetRect} 
          padding={step.spotlightPadding || 8} 
          stepId={step.id}
        />
      )}
    </AnimatePresence>
  );
}

interface SpotlightOverlayProps {
  rect: DOMRect;
  padding: number;
  stepId: string;
}

function SpotlightOverlay({ rect, padding, stepId }: SpotlightOverlayProps) {
  const spotlightStyle = {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };

  return (
    <motion.div
      key={stepId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[10000] pointer-events-none"
    >
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.rect
              initial={{ 
                x: spotlightStyle.left,
                y: spotlightStyle.top,
                width: spotlightStyle.width,
                height: spotlightStyle.height,
              }}
              animate={{ 
                x: spotlightStyle.left,
                y: spotlightStyle.top,
                width: spotlightStyle.width,
                height: spotlightStyle.height,
              }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <motion.rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#spotlight-mask)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </svg>

      {/* Animated glowing border around spotlight */}
      <motion.div
        initial={{ 
          opacity: 0,
          scale: 1.1,
          ...spotlightStyle 
        }}
        animate={{ 
          opacity: 1,
          scale: 1,
          ...spotlightStyle 
        }}
        transition={{ 
          duration: 0.4, 
          ease: [0.4, 0, 0.2, 1],
          opacity: { delay: 0.1 }
        }}
        className="absolute rounded-lg ring-2 ring-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]"
        style={{ position: 'absolute' }}
      >
        {/* Pulse animation */}
        <motion.div
          className="absolute inset-0 rounded-lg ring-2 ring-primary/50"
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>
    </motion.div>
  );
}
