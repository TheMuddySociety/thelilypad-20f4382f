import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NFT_CONTRACT_ABI } from "@/config/nftContract";
import { useWallet } from "@/providers/WalletProvider";
import { formatEther } from "viem";

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

export function useOnChainPhaseSync(contractAddress: string | null, collectionId: string | null) {
  const { currentChain } = useWallet();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callContract = useCallback(async (functionName: string, args: any[] = []): Promise<any> => {
    if (!contractAddress) throw new Error("No contract address");

    const rpcUrl = currentChain.rpcUrls.default.http[0];
    
    // Find the function in ABI
    const func = NFT_CONTRACT_ABI.find(
      (item) => item.type === "function" && item.name === functionName
    );
    if (!func || func.type !== "function") {
      throw new Error(`Function ${functionName} not found in ABI`);
    }

    // Encode function call
    const { encodeFunctionData, decodeFunctionResult } = await import("viem");
    const data = encodeFunctionData({
      abi: NFT_CONTRACT_ABI,
      functionName: functionName as any,
      args: args as any,
    });

    // Make RPC call
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: contractAddress, data }, "latest"],
        id: 1,
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || "RPC call failed");
    }

    // Decode result
    const decoded = decodeFunctionResult({
      abi: NFT_CONTRACT_ABI,
      functionName: functionName as any,
      data: result.result,
    });

    return decoded;
  }, [contractAddress, currentChain.rpcUrls]);

  const syncPhases = useCallback(async (): Promise<SyncResult | null> => {
    if (!contractAddress || !collectionId) {
      setError("No contract or collection ID");
      return null;
    }

    setIsSyncing(true);
    setError(null);

    try {
      console.log("[Phase Sync] Starting on-chain phase sync for:", contractAddress);
      
      const rpcUrl = currentChain.rpcUrls.default.http[0];
      const activePhaseId = await callContract("activePhase");
      console.log("[Phase Sync] Active phase ID:", Number(activePhaseId));

      // 2. Get total supply from contract
      const totalSupply = await callContract("totalSupply");
      console.log("[Phase Sync] Total supply:", Number(totalSupply));

      // 3. Read phase data for phases 0, 1, 2 (common phase IDs)
      const phases: OnChainPhase[] = [];
      
      // Try to read phases 0-3 (allowlist and public phases)
      for (let phaseId = 0; phaseId <= 3; phaseId++) {
        try {
          const phaseData = await callContract("getPhase", [BigInt(phaseId)]);
          
          // phaseData returns: [price, maxPerWallet, supply, minted, requiresAllowlist, isActive]
          const [price, maxPerWallet, supply, minted, requiresAllowlist, isActive] = phaseData as [bigint, bigint, bigint, bigint, boolean, boolean];
          
          // Only include phases that have been configured (supply > 0 or it's the active phase)
          if (Number(supply) > 0 || phaseId === Number(activePhaseId)) {
            phases.push({
              phaseId,
              price: formatEther(price),
              maxPerWallet: Number(maxPerWallet),
              supply: Number(supply),
              minted: Number(minted),
              requiresAllowlist,
              isActive,
            });
            console.log(`[Phase Sync] Phase ${phaseId}:`, { price: formatEther(price), supply: Number(supply), isActive });
          }
        } catch (err) {
          // Phase doesn't exist or error reading it - skip
          console.log(`[Phase Sync] Phase ${phaseId} not configured or error:`, err);
        }
      }

      // 4. Update database with on-chain data
      // Fetch current collection to get existing phases
      const { data: collection, error: fetchError } = await supabase
        .from("collections")
        .select("phases, minted")
        .eq("id", collectionId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to fetch collection: ${fetchError.message}`);
      }

      // Map on-chain phases to DB format
      const existingPhases = (collection?.phases || []) as any[];
      const updatedPhases = existingPhases.map((phase: any) => {
        // Try to match by ID or name
        const phaseIdMatch = phase.id === "public" ? 1 : phase.id === "allowlist" ? 0 : parseInt(phase.id) || 0;
        const onChainPhase = phases.find(p => p.phaseId === phaseIdMatch);
        
        if (onChainPhase) {
          return {
            ...phase,
            isActive: onChainPhase.isActive,
            minted: onChainPhase.minted,
            // Optionally update price if different
            // price: onChainPhase.price,
          };
        }
        
        // If no match, check if this phase should be active based on activePhaseId
        const isThisPhaseActive = 
          (phase.id === "public" && Number(activePhaseId) === 1) ||
          (phase.id === "allowlist" && Number(activePhaseId) === 0);
        
        return {
          ...phase,
          isActive: isThisPhaseActive,
        };
      });

      // Update the collection
      const { error: updateError } = await supabase
        .from("collections")
        .update({
          phases: updatedPhases,
          minted: Number(totalSupply),
        })
        .eq("id", collectionId);

      if (updateError) {
        throw new Error(`Failed to update collection: ${updateError.message}`);
      }

      const result: SyncResult = {
        activePhaseId: Number(activePhaseId),
        totalSupply: Number(totalSupply),
        phases,
        dbUpdated: true,
      };

      setLastSyncResult(result);
      console.log("[Phase Sync] Sync complete:", result);
      
      toast.success("Phase Synced!", {
        description: `Active phase: ${Number(activePhaseId)}, Minted: ${Number(totalSupply)}`,
      });

      return result;
    } catch (err: any) {
      console.error("[Phase Sync] Error:", err);
      setError(err.message || "Sync failed");
      toast.error("Sync Failed", {
        description: err.message || "Could not read on-chain data",
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [contractAddress, collectionId, callContract]);

  return {
    syncPhases,
    isSyncing,
    lastSyncResult,
    error,
  };
}
