import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
  type: "circle" | "square" | "star";
}

interface ConfettiCelebrationProps {
  isActive: boolean;
  onComplete?: () => void;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)", // green
  "hsl(48, 96%, 53%)",  // yellow
  "hsl(280, 87%, 65%)", // purple
  "hsl(199, 89%, 48%)", // blue
  "hsl(350, 89%, 60%)", // pink
];

const generateConfetti = (count: number): ConfettiPiece[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.5,
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.5,
    type: ["circle", "square", "star"][Math.floor(Math.random() * 3)] as "circle" | "square" | "star",
  }));
};

function ConfettiShape({ type, color }: { type: "circle" | "square" | "star"; color: string }) {
  if (type === "circle") {
    return <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />;
  }
  if (type === "square") {
    return <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />;
  }
  // Star
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function ConfettiCelebration({ isActive, onComplete }: ConfettiCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (isActive) {
      setConfetti(generateConfetti(50));
      setShowMessage(true);
      
      const timer = setTimeout(() => {
        setConfetti([]);
        setShowMessage(false);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive && confetti.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[10002] pointer-events-none overflow-hidden">
      {/* Confetti pieces */}
      <AnimatePresence>
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              x: `${piece.x}vw`,
              y: -20,
              rotate: 0,
              scale: piece.scale,
              opacity: 1,
            }}
            animate={{
              y: "110vh",
              rotate: piece.rotation + 720,
              opacity: [1, 1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 3 + Math.random() * 2,
              delay: piece.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute"
            style={{ left: `${piece.x}%` }}
          >
            <motion.div
              animate={{
                x: [0, Math.sin(piece.id) * 50, Math.sin(piece.id + 1) * -30, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ConfettiShape type={piece.type} color={piece.color} />
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Celebration message */}
      <AnimatePresence>
        {showMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.2,
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="bg-card/95 backdrop-blur-sm border rounded-2xl px-8 py-6 shadow-2xl text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-5xl mb-3"
              >
                🎉
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-xl font-bold text-foreground mb-2"
              >
                You're all set!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-muted-foreground text-sm"
              >
                You're ready to create your first NFT collection
              </motion.p>
              
              {/* Sparkle effects around the card */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-primary rounded-full"
                  style={{
                    top: `${20 + Math.random() * 60}%`,
                    left: `${10 + Math.random() * 80}%`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.5 + i * 0.15,
                    repeat: 1,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
