// RPC Failover Hook - Solana focused
// Provides Solana RPC health checking and failover

import { useState, useEffect, useCallback, useMemo } from "react";
import { NetworkType, getSolanaRpcUrl, checkRpcHealth, RpcHealthStatus } from "@/config/alchemy";

interface UseRpcFailoverReturn {
  currentRpc: string;
  isHealthy: boolean;
  isFailingOver: boolean;
  healthStatuses: RpcHealthStatus[];
  failover: () => Promise<string | null>;
  checkHealth: () => Promise<void>;
  resetFailedRpcs: () => void;
}

export const useRpcFailover = (network: NetworkType = "testnet"): UseRpcFailoverReturn => {
  const [currentRpc, setCurrentRpc] = useState(() => getSolanaRpcUrl(network));
  const [isHealthy, setIsHealthy] = useState(true);
  const [isFailingOver, setIsFailingOver] = useState(false);
  const [healthStatuses, setHealthStatuses] = useState<RpcHealthStatus[]>([]);

  const checkHealthAsync = useCallback(async () => {
    try {
      const rpcUrl = getSolanaRpcUrl(network);
      const status = await checkRpcHealth(rpcUrl);
      setHealthStatuses([status]);
      setIsHealthy(status.healthy);
      setCurrentRpc(rpcUrl);
    } catch (e) {
      console.error("Health check failed:", e);
      setIsHealthy(false);
    }
  }, [network]);

  useEffect(() => {
    checkHealthAsync();
    // Check every 2 minutes
    const interval = setInterval(checkHealthAsync, 120000);
    return () => clearInterval(interval);
  }, [checkHealthAsync]);

  const failover = useCallback(async () => {
    setIsFailingOver(true);
    try {
      // For Solana, we only have one RPC per network
      const rpcUrl = getSolanaRpcUrl(network);
      const status = await checkRpcHealth(rpcUrl);
      if (status.healthy) {
        setCurrentRpc(rpcUrl);
        setIsHealthy(true);
        return rpcUrl;
      }
      return null;
    } finally {
      setIsFailingOver(false);
    }
  }, [network]);

  const resetFailedRpcs = useCallback(() => {
    setIsHealthy(true);
  }, []);

  return {
    currentRpc,
    isHealthy,
    isFailingOver,
    healthStatuses,
    failover,
    checkHealth: checkHealthAsync,
    resetFailedRpcs,
  };
};
