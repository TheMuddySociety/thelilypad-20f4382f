// Monad TheLilyPad Mint - Coming Soon
import { useState, useCallback } from "react";
import { toast } from "sonner";

export type MintStep = 'idle' | 'waiting_wallet' | 'submitting' | 'processing' | 'syncing' | 'success' | 'error';
const MONAD_COMING_SOON = "Monad EVM support is coming soon.";

export function useTheLilyPadMint() {
  const [state, setState] = useState({ isMinting: false, step: 'idle' as MintStep, txHash: null as string | null, error: null as string | null, mintedTokenIds: [] as number[] });
  const mint = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  const resetState = useCallback(() => setState({ isMinting: false, step: 'idle', txHash: null, error: null, mintedTokenIds: [] }), []);
  return { ...state, mint, resetState, isMonadSupported: false };
}
