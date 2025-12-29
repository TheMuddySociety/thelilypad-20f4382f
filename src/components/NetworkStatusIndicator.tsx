import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff, Wifi, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const NetworkStatusIndicator = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  // Only show when offline or on slow connection
  if (isOnline && !isSlowConnection) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm ${
          !isOnline
            ? "bg-destructive/90 text-destructive-foreground"
            : "bg-warning/90 text-warning-foreground"
        }`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">You're offline</span>
          </>
        ) : isSlowConnection ? (
          <>
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Slow connection</span>
          </>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
};

export default NetworkStatusIndicator;
