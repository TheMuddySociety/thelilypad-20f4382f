// Monad Marketplace Contract - Coming Soon
import { useState, useCallback } from "react";
import { toast } from "sonner";

const MONAD_COMING_SOON = "Monad EVM support is coming soon.";

export function useMarketplaceContract() {
  const [isLoading] = useState(false);
  const listNFT = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  const buyNFT = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  const cancelListing = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  const makeOffer = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  const acceptOffer = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  return { isLoading, listNFT, buyNFT, cancelListing, makeOffer, acceptOffer, isMonadSupported: false };
}
