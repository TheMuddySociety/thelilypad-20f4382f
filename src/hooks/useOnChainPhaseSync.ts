// Monad On-Chain Phase Sync - Coming Soon
import { useState, useCallback } from "react";

interface OnChainPhase { phaseId: number; price: string; maxPerWallet: number; supply: number; minted: number; requiresAllowlist: boolean; isActive: boolean; }
interface SyncResult { activePhaseId: number; totalSupply: number; phases: OnChainPhase[]; dbUpdated: boolean; }

export function useOnChainPhaseSync(_contractAddress: string | null, _collectionId: string | null) {
  const [isSyncing] = useState(false);
  const [lastSyncResult] = useState<SyncResult | null>(null);
  const [error] = useState<string | null>(null);
  const syncPhases = useCallback(async () => null, []);
  return { isSyncing, lastSyncResult, error, syncPhases, isMonadSupported: false };
}
