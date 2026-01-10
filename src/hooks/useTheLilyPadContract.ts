// Monad TheLilyPad Contract - Coming Soon
import { useState, useCallback } from "react";
import { toast } from "sonner";

const MONAD_COMING_SOON = "Monad EVM support is coming soon.";

export function useTheLilyPadContract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mint = useCallback(async () => { toast.info(MONAD_COMING_SOON); return null; }, []);
  const getMintedCount = useCallback(async () => 0, []);
  return { isLoading, error, mint, getMintedCount, isMonadSupported: false };
}
