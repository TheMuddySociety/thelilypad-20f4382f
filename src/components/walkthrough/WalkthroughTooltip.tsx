import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WalkthroughStep } from "@/hooks/useLaunchpadWalkthrough";

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
  const tooltipRef = useRef<HTMLDivElement>(null);

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

  return (
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="fixed z-[10001] w-80 max-w-[calc(100vw-32px)]"
        style={{ top: position.top, left: position.left }}
      >
        {/* Arrow */}
        <div
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
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2">
            <h3 className="font-semibold text-foreground">{step.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2"
              onClick={onSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Description */}
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            {step.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentIndex
                      ? "bg-primary"
                      : i < currentIndex
                      ? "bg-primary/40"
                      : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={onPrev}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={onNext}>
                {isLast ? (
                  "Got it!"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Spotlight overlay */}
      {targetRect && (
        <SpotlightOverlay rect={targetRect} padding={step.spotlightPadding || 8} />
      )}
    </AnimatePresence>
  );
}

interface SpotlightOverlayProps {
  rect: DOMRect;
  padding: number;
}

function SpotlightOverlay({ rect, padding }: SpotlightOverlayProps) {
  const spotlightStyle = {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] pointer-events-none"
    >
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={spotlightStyle.left}
              y={spotlightStyle.top}
              width={spotlightStyle.width}
              height={spotlightStyle.height}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Glowing border around spotlight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent"
        style={spotlightStyle}
      />
    </motion.div>
  );
}
