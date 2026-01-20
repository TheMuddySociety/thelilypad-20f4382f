import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAUpdateNotification = () => {
  const { needRefresh, updateServiceWorker, dismissUpdate } = usePWAUpdate();

  if (!needRefresh) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] md:bottom-6"
      >
        <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-4 max-w-md">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              New version available!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click update to get the latest features
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={dismissUpdate}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={updateServiceWorker}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Update
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
