// Monad Contract Allowlist - Coming Soon
import { useState, useCallback } from "react";
import { toast } from "sonner";

const MONAD_COMING_SOON = "Monad EVM support is coming soon.";

export function useContractAllowlist(_contractAddress: string | null) {
  const [state, setState] = useState({ isUpdating: false, txHash: null as string | null, error: null as string | null });
  const resetState = useCallback(() => setState({ isUpdating: false, txHash: null, error: null }), []);
  const setAllowlist = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  const setMerkleRoot = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  return { ...state, resetState, setAllowlist, setMerkleRoot, isMonadSupported: false };
}
