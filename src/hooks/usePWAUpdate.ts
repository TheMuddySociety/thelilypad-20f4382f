import { useState, useEffect, useCallback } from 'react';

interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
  dismissUpdate: () => void;
}

export const usePWAUpdate = (): PWAUpdateState => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      setRegistration(reg);

      // Check for updates periodically (every 5 minutes)
      setInterval(() => {
        reg.update();
      }, 5 * 60 * 1000);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available
              setNeedRefresh(true);
            } else {
              // Content cached for offline use
              setOfflineReady(true);
            }
          }
        });
      });

      // Handle controller change (when skipWaiting is called)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      // Check if there's already a waiting worker
      if (reg.waiting) {
        setNeedRefresh(true);
      }
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  };

  const updateServiceWorker = useCallback(async () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to take control
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [registration]);

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
  }, []);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    dismissUpdate,
  };
};
