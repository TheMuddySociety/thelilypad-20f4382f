import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NFT_COLLECTION_ABI } from "@/config/nftFactory";
import { useWallet } from "@/providers/WalletProvider";
import { formatEther, createPublicClient, http } from "viem";

interface OnChainPhase {
  phaseId: number;
  price: string;
  maxPerWallet: number;
  supply: number;
  minted: number;
  requiresAllowlist: boolean;
  isActive: boolean;
}

interface SyncResult {
  activePhaseId: number;
  totalSupply: number;
  phases: OnChainPhase[];
  dbUpdated: boolean;
}

/**
 * Hook for syncing on-chain NFT collection state with Supabase.
 * Optimized for Monad using Multicall3 to reduce RPC latency.
 */
export function useOnChainPhaseSync(contractAddress: string | null, collectionId: string | null) {
  const { currentChain } = useWallet();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncPhases = useCallback(async (): Promise<SyncResult | null> => {
    if (!contractAddress || !collectionId) {
      setError("No contract or collection ID");
      return null;
    }

    setIsSyncing(true);
    setError(null);

    try {
      console.log("[Phase Sync] Starting on-chain phase sync for:", contractAddress);

      // Initialize Viem Public Client
      const client = createPublicClient({
        chain: currentChain,
        transport: http()
      });

      // 1. Prepare multicall requests (Global state + 4 Phases)
      const contracts = [
        {
          address: contractAddress as `0x${string}`,
          abi: NFT_COLLECTION_ABI,
          functionName: 'activePhaseId',
        },
        {
          address: contractAddress as `0x${string}`,
          abi: NFT_COLLECTION_ABI,
          functionName: 'paused',
        },
        {
          address: contractAddress as `0x${string}`,
          abi: NFT_COLLECTION_ABI,
          functionName: 'totalSupply',
        },
        // Phase data for IDs 0, 1, 2, 3
        {
          address: contractAddress as `0x${string}`,
          abi: NFT_COLLECTION_ABI,
          functionName: 'phases',
          args: [0n],
        },
        {
          address: contractAddress as `0x${string}`,
          abi: NFT_COLLECTION_ABI,
          functionName: 'phases',
          args: [1n],
        },
        {
          address: contractAddress as `0x${string}`,
          abi: NFT_COLLECTION_ABI,
          functionName: 'phases',
          args: [2n],
        },
        {
          address: contractAddress as `0x${string}`,
          abi: NFT_COLLECTION_ABI,
          functionName: 'phases',
          args: [3n],
        },
      ];

      // 2. Execute multicall
      console.log("[Phase Sync] Executing multicall for 7 static reads...");
      const results = await client.multicall({
        contracts: contracts as any,
        // Official Multicall3 address on Monad
        multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11'
      });

      // 3. Extract Global State
      const activePhaseId = results[0]?.status === 'success' ? (results[0].result as bigint) : 0n;
      const isPaused = results[1]?.status === 'success' ? (results[1].result as boolean) : false;
      const totalSupply = results[2]?.status === 'success' ? (results[2].result as bigint) : 0n;

      console.log("[Phase Sync] Global state from multicall:", {
        activePhaseId: Number(activePhaseId),
        isPaused,
        totalSupply: Number(totalSupply)
      });

      // 4. Process Phase Data Results
      const phases: OnChainPhase[] = [];
      const phaseDataResults = results.slice(3);

      phaseDataResults.forEach((res, index) => {
        if (res.status === 'success' && res.result) {
          const phaseId = index;
          // Cast to unknown first to safely cast to the expected tuple
          const [price, maxPerWallet, supply, minted, requiresAllowlist] = res.result as unknown as [bigint, bigint, bigint, bigint, boolean];

          const isActive = !isPaused && Number(activePhaseId) === phaseId;

          // Only include phases that have been configured (supply > 0 or it's the active phase)
          if (Number(supply) > 0 || isActive) {
            phases.push({
              phaseId,
              price: formatEther(price),
              maxPerWallet: Number(maxPerWallet),
              supply: Number(supply),
              minted: Number(minted),
              requiresAllowlist,
              isActive,
            });
            console.log(`[Phase Sync] Multicall Phase ${phaseId}:`, {
              price: formatEther(price),
              supply: Number(supply),
              isActive,
              minted: Number(minted)
            });
          }
        }
      });

      // 5. Update Supabase with on-chain data
      const { data: collection, error: fetchError } = await supabase
        .from("collections")
        .select("phases, minted")
        .eq("id", collectionId)
        .maybeSingle();

      if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
      if (!collection) throw new Error("Collection record not found in database.");

      // Map on-chain phases to DB format
      const existingPhases = (collection?.phases || []) as any[];
      const updatedPhases = existingPhases.map((phase: any) => {
        // Try to match by ID mapping (allowlist=0, public=1)
        const phaseIdMatch = phase.id === "public" ? 1 : phase.id === "allowlist" ? 0 : parseInt(phase.id) || 0;
        const onChainPhase = phases.find(p => p.phaseId === phaseIdMatch);

        if (onChainPhase) {
          return {
            ...phase,
            isActive: onChainPhase.isActive,
            minted: onChainPhase.minted,
          };
        }

        // Fallback: update isActive even if phase data wasn't returned in the primary block
        const isThisPhaseActive =
          (phase.id === "public" && Number(activePhaseId) === 1) ||
          (phase.id === "allowlist" && Number(activePhaseId) === 0);

        return {
          ...phase,
          isActive: isThisPhaseActive,
        };
      });

      const { error: updateError } = await supabase
        .from("collections")
        .update({
          phases: updatedPhases,
          minted: Number(totalSupply),
        })
        .eq("id", collectionId);

      if (updateError) throw new Error(`Database error: ${updateError.message}`);

      const result: SyncResult = {
        activePhaseId: Number(activePhaseId),
        totalSupply: Number(totalSupply),
        phases,
        dbUpdated: true,
      };

      setLastSyncResult(result);
      toast.success("Sync Complete", {
        description: `Verified state for ${phases.length} phases.`,
      });

      return result;
    } catch (err: any) {
      console.error("[Phase Sync] Critical Error:", err);
      setError(err.message || "Sync failed");
      toast.error("Sync Failed", {
        description: err.message || "Could not synchronize with on-chain state.",
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [contractAddress, collectionId, currentChain]);

  return {
    syncPhases,
    isSyncing,
    lastSyncResult,
    error,
  };
}
