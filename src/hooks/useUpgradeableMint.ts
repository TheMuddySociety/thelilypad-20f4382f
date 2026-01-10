// Monad Upgradeable Mint - Coming Soon
import { useState, useCallback } from "react";
import { toast } from "sonner";

export type MintStep = 'idle' | 'waiting_wallet' | 'submitting' | 'processing' | 'syncing' | 'success' | 'error';
const MONAD_COMING_SOON = "Monad EVM support is coming soon.";

export function useUpgradeableMint() {
  const [state, setState] = useState({ isMinting: false, step: 'idle' as MintStep, txHash: null as string | null, error: null as string | null, mintedTokenId: null as number | null });
  const mint = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  const resetState = useCallback(() => setState({ isMinting: false, step: 'idle', txHash: null, error: null, mintedTokenId: null }), []);
  return { ...state, mint, resetState, isMonadSupported: false };
}
