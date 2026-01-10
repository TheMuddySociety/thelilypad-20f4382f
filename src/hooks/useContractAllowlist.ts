// Monad Contract Allowlist - Coming Soon
import { useState, useCallback } from "react";
import { toast } from "sonner";

const MONAD_COMING_SOON = "Monad EVM support is coming soon.";

export function useContractAllowlist(_contractAddress?: string | null) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  const resetState = useCallback(() => {
    setIsUpdating(false);
    setTxHash("");
    setError("");
  }, []);

  const setAllowlist = useCallback(async () => {
    toast.info(MONAD_COMING_SOON);
    return null;
  }, []);

  const setMerkleRoot = useCallback(async () => {
    toast.info(MONAD_COMING_SOON);
    return null;
  }, []);

  const configurePhase = useCallback(async (
    _contractAddress: string,
    _phaseId: number,
    _config: {
      price: string;
      maxPerWallet: number;
      supply: number;
      startTime: number;
      endTime: number;
      merkleRoot: string;
    }
  ) => {
    toast.info(MONAD_COMING_SOON);
    return null;
  }, []);

  const setActivePhase = useCallback(async (_contractAddress: string, _phaseId: number) => {
    toast.info(MONAD_COMING_SOON);
    return null;
  }, []);

  return {
    isUpdating,
    txHash,
    error,
    resetState,
    setAllowlist,
    setMerkleRoot,
    configurePhase,
    setActivePhase,
    isMonadSupported: false,
  };
}
