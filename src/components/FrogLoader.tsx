import { motion } from "framer-motion";

interface FrogLoaderProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

const FrogLoader = ({ text = "Hopping onto the lily pad...", size = "md" }: FrogLoaderProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Lily Pads */}
      <div className="relative flex items-end gap-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="relative">
            {/* Lily Pad */}
            <motion.div
              className="relative"
              initial={{ scale: 0.9 }}
              animate={{ scale: [0.9, 1, 0.9] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.2,
              }}
            >
              <svg
                viewBox="0 0 100 60"
                className={`${sizeClasses[size]} text-lily-green`}
                fill="currentColor"
              >
                {/* Lily pad shape */}
                <ellipse cx="50" cy="35" rx="45" ry="25" className="fill-lily-green/80" />
                <ellipse cx="50" cy="32" rx="42" ry="22" className="fill-lily-green" />
                {/* Notch in lily pad */}
                <path d="M50 10 L45 35 L55 35 Z" className="fill-background" />
                {/* Veins on lily pad */}
                <path
                  d="M50 35 L30 25 M50 35 L70 25 M50 35 L25 40 M50 35 L75 40"
                  stroke="currentColor"
                  strokeWidth="1"
                  fill="none"
                  className="stroke-lily-green-dark/30"
                />
              </svg>
            </motion.div>

            {/* Frog hopping between pads */}
            <motion.div
              className="absolute -top-8 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [0, -20, -20, 0],
                scale: [0.8, 1.1, 1.1, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.5,
                times: [0, 0.3, 0.7, 1],
              }}
            >
              <svg
                viewBox="0 0 60 50"
                className="w-10 h-10"
                fill="none"
              >
                {/* Frog body */}
                <ellipse cx="30" cy="30" rx="18" ry="14" className="fill-frog-green" />
                {/* Frog head */}
                <ellipse cx="30" cy="18" rx="14" ry="12" className="fill-frog-green" />
                {/* Eyes */}
                <circle cx="22" cy="12" r="6" className="fill-frog-light" />
                <circle cx="38" cy="12" r="6" className="fill-frog-light" />
                <circle cx="22" cy="12" r="3" className="fill-frog-dark" />
                <circle cx="38" cy="12" r="3" className="fill-frog-dark" />
                {/* Eye shine */}
                <circle cx="23" cy="11" r="1" className="fill-white" />
                <circle cx="39" cy="11" r="1" className="fill-white" />
                {/* Smile */}
                <path
                  d="M24 24 Q30 28 36 24"
                  className="stroke-frog-dark"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Front legs */}
                <ellipse cx="16" cy="38" rx="6" ry="4" className="fill-frog-green" />
                <ellipse cx="44" cy="38" rx="6" ry="4" className="fill-frog-green" />
                {/* Back legs */}
                <ellipse cx="12" cy="32" rx="8" ry="5" className="fill-frog-green" transform="rotate(-20 12 32)" />
                <ellipse cx="48" cy="32" rx="8" ry="5" className="fill-frog-green" transform="rotate(20 48 32)" />
                {/* Spots */}
                <circle cx="25" cy="28" r="2" className="fill-frog-dark/30" />
                <circle cx="35" cy="30" r="2" className="fill-frog-dark/30" />
                <circle cx="30" cy="35" r="1.5" className="fill-frog-dark/30" />
              </svg>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Loading text with animated dots */}
      <motion.p
        className={`${textSizes[size]} font-medium text-foreground/80`}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {text}
      </motion.p>

      {/* Ripple effect */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-lily-green"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default FrogLoader;
