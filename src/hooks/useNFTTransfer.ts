// Monad NFT Transfer - Coming Soon
import { useState, useCallback } from "react";
import { toast } from "sonner";

const MONAD_COMING_SOON = "Monad EVM support is coming soon.";

export function useNFTTransfer() {
  const [state, setState] = useState({ isTransferring: false, txHash: null as string | null, error: null as string | null });
  const resetState = useCallback(() => setState({ isTransferring: false, txHash: null, error: null }), []);
  const transferNFT = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  return { ...state, resetState, transferNFT, isMonadSupported: false };
}
