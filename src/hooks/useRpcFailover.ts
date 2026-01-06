import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { 
  NetworkType, 
  getRpcUrls, 
  checkRpcHealth, 
  RpcHealthStatus,
  getPreferredRpcUrl 
} from "@/config/alchemy";
import { toast } from "sonner";

interface RpcFailoverState {
  currentRpc: string;
  isFailingOver: boolean;
  failedRpcs: Set<string>;
  lastHealthCheck: Date | null;
}

interface UseRpcFailoverReturn {
  currentRpc: string;
  isHealthy: boolean;
  isFailingOver: boolean;
  healthStatuses: RpcHealthStatus[];
  failover: () => Promise<string | null>;
  executeWithFailover: <T>(
    operation: (rpcUrl: string) => Promise<T>,
    options?: { silent?: boolean; maxRetries?: number }
  ) => Promise<T>;
  checkHealth: () => Promise<void>;
  resetFailedRpcs: () => void;
}

// Global state to persist across component unmounts
const globalFailedRpcs: Record<NetworkType, Set<string>> = {
  mainnet: new Set(),
  testnet: new Set(),
};

// Track last successful RPC per network
const lastSuccessfulRpc: Record<NetworkType, string | null> = {
  mainnet: null,
  testnet: null,
};

// Cache health check results globally to prevent duplicate checks
const healthCheckCache: Record<NetworkType, { results: RpcHealthStatus[]; timestamp: number }> = {
  mainnet: { results: [], timestamp: 0 },
  testnet: { results: [], timestamp: 0 },
};

// Health check interval - 2 minutes for better performance
const HEALTH_CHECK_INTERVAL = 120000;
// Cache validity - results valid for 90 seconds
const CACHE_VALIDITY = 90000;

export const useRpcFailover = (network: NetworkType): UseRpcFailoverReturn => {
  const rpcs = useMemo(() => getRpcUrls(network), [network]);
  const preferredRpc = getPreferredRpcUrl(network);
  
  const [state, setState] = useState<RpcFailoverState>(() => ({
    currentRpc: lastSuccessfulRpc[network] || preferredRpc || rpcs[0],
    isFailingOver: false,
    failedRpcs: globalFailedRpcs[network],
    lastHealthCheck: null,
  }));
  
  const [healthStatuses, setHealthStatuses] = useState<RpcHealthStatus[]>(
    healthCheckCache[network].results
  );
  const [isHealthy, setIsHealthy] = useState(true);
  
  const failoverInProgress = useRef(false);
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Check health of RPCs - only check current + preferred, not all
  const checkHealth = useCallback(async () => {
    // Check if cache is still valid
    const cache = healthCheckCache[network];
    const now = Date.now();
    
    if (cache.results.length > 0 && now - cache.timestamp < CACHE_VALIDITY) {
      setHealthStatuses(cache.results);
      const currentHealth = cache.results.find(r => r.url === state.currentRpc);
      setIsHealthy(currentHealth?.healthy ?? true);
      return;
    }

    // Only check a subset of RPCs for performance (current, preferred, and 2 backups)
    const rpcsToCheck = new Set<string>();
    rpcsToCheck.add(state.currentRpc);
    if (preferredRpc) rpcsToCheck.add(preferredRpc);
    // Add first 2 RPCs from the list as fallbacks
    rpcs.slice(0, 2).forEach(r => rpcsToCheck.add(r));
    
    const checkPromises = Array.from(rpcsToCheck).map(url => 
      checkRpcHealth(url, 5000, network)
    );
    
    const results = await Promise.all(checkPromises);
    
    if (!mountedRef.current) return;
    
    // Merge with cached results for RPCs we didn't check
    const resultMap = new Map(results.map(r => [r.url, r]));
    const mergedResults = rpcs.map(url => 
      resultMap.get(url) || cache.results.find(r => r.url === url) || {
        url,
        healthy: true, // Assume healthy if not checked
        latency: null,
      }
    );
    
    // Update cache
    healthCheckCache[network] = { results: mergedResults, timestamp: now };
    setHealthStatuses(mergedResults);
    
    // Update failed RPCs based on health check
    const newFailedRpcs = new Set<string>();
    results.forEach(result => {
      const isHardFailure = !result.healthy && (
        result.error === 'Timeout' ||
        result.error?.includes('HTTP') ||
        result.error?.includes('fetch') ||
        result.error?.includes('network') ||
        result.latency === null
      );
      
      if (isHardFailure) {
        newFailedRpcs.add(result.url);
      }
    });
    
    globalFailedRpcs[network] = newFailedRpcs;
    setState(prev => ({
      ...prev,
      failedRpcs: newFailedRpcs,
      lastHealthCheck: new Date(),
    }));
    
    // Check if current RPC is healthy
    const currentHealth = results.find(r => r.url === state.currentRpc);
    setIsHealthy(currentHealth?.healthy ?? true);
    
    // If current RPC is unhealthy and not already failing over, trigger failover
    if (currentHealth && !currentHealth.healthy && !failoverInProgress.current) {
      await failover();
    }
  }, [network, rpcs, state.currentRpc, preferredRpc]);

  // Find next healthy RPC
  const findHealthyRpc = useCallback(async (): Promise<string | null> => {
    const availableRpcs = rpcs.filter(url => !globalFailedRpcs[network].has(url));
    
    // Check health of available RPCs in order
    for (const rpcUrl of availableRpcs) {
      const health = await checkRpcHealth(rpcUrl, 3000, network);
      if (health.healthy) {
        return rpcUrl;
      } else {
        const isHardFailure = health.error === 'Timeout' ||
          health.error?.includes('HTTP') ||
          health.error?.includes('fetch') ||
          health.latency === null;
        
        if (isHardFailure) {
          globalFailedRpcs[network].add(rpcUrl);
        }
      }
    }
    
    // If all RPCs in the failed list, reset and try again
    if (globalFailedRpcs[network].size >= rpcs.length) {
      console.log("All RPCs marked as failed, resetting and retrying...");
      globalFailedRpcs[network].clear();
      
      for (const rpcUrl of rpcs) {
        const health = await checkRpcHealth(rpcUrl, 3000, network);
        if (health.healthy) {
          return rpcUrl;
        }
      }
    }
    
    return null;
  }, [network, rpcs]);

  // Failover to next healthy RPC
  const failover = useCallback(async (): Promise<string | null> => {
    if (failoverInProgress.current) {
      return state.currentRpc;
    }
    
    failoverInProgress.current = true;
    setState(prev => ({ ...prev, isFailingOver: true }));
    
    try {
      globalFailedRpcs[network].add(state.currentRpc);
      
      const newRpc = await findHealthyRpc();
      
      if (newRpc && newRpc !== state.currentRpc) {
        lastSuccessfulRpc[network] = newRpc;
        setState(prev => ({
          ...prev,
          currentRpc: newRpc,
          failedRpcs: globalFailedRpcs[network],
          isFailingOver: false,
        }));
        setIsHealthy(true);
        
        toast.info("RPC Failover", {
          description: `Switched to ${new URL(newRpc).hostname}`,
          duration: 3000,
        });
        
        return newRpc;
      } else if (!newRpc) {
        setIsHealthy(false);
        toast.error("All RPCs Unavailable", {
          description: "Unable to connect to any RPC endpoint. Please try again later.",
          duration: 5000,
        });
      }
      
      return null;
    } finally {
      failoverInProgress.current = false;
      setState(prev => ({ ...prev, isFailingOver: false }));
    }
  }, [network, state.currentRpc, findHealthyRpc]);

  // Execute operation with automatic failover
  const executeWithFailover = useCallback(async <T>(
    operation: (rpcUrl: string) => Promise<T>,
    options: { silent?: boolean; maxRetries?: number } = {}
  ): Promise<T> => {
    const { silent = false, maxRetries = 3 } = options;
    let lastError: Error | null = null;
    let currentRpcUrl = state.currentRpc;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await operation(currentRpcUrl);
        
        globalFailedRpcs[network].delete(currentRpcUrl);
        lastSuccessfulRpc[network] = currentRpcUrl;
        
        if (currentRpcUrl !== state.currentRpc) {
          setState(prev => ({ ...prev, currentRpc: currentRpcUrl }));
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        const isRpcError = 
          error.name === 'TypeError' ||
          error.message?.includes('network') ||
          error.message?.includes('fetch') ||
          error.message?.includes('timeout') ||
          error.message?.includes('connection') ||
          error.code === 'NETWORK_ERROR' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT';
        
        if (isRpcError) {
          console.log(`RPC ${currentRpcUrl} failed, attempting failover...`);
          globalFailedRpcs[network].add(currentRpcUrl);
          
          const newRpc = await findHealthyRpc();
          if (newRpc) {
            currentRpcUrl = newRpc;
            if (!silent) {
              toast.info("Switching RPC", {
                description: `Retrying with ${new URL(newRpc).hostname}`,
                duration: 2000,
              });
            }
            continue;
          }
        }
        
        throw error;
      }
    }
    
    throw lastError || new Error("Operation failed after retries");
  }, [network, state.currentRpc, findHealthyRpc]);

  // Reset failed RPCs
  const resetFailedRpcs = useCallback(() => {
    globalFailedRpcs[network].clear();
    healthCheckCache[network] = { results: [], timestamp: 0 };
    setState(prev => ({
      ...prev,
      failedRpcs: new Set(),
    }));
  }, [network]);

  // Periodic health check - less frequent
  useEffect(() => {
    mountedRef.current = true;
    
    // Initial check after a short delay
    const initialTimeout = setTimeout(checkHealth, 1000);
    
    // Periodic checks every 2 minutes
    healthCheckInterval.current = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimeout);
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
    };
  }, [checkHealth]);

  // Reset to preferred RPC when it changes
  useEffect(() => {
    if (preferredRpc && !globalFailedRpcs[network].has(preferredRpc)) {
      setState(prev => ({ ...prev, currentRpc: preferredRpc }));
    }
  }, [preferredRpc, network]);

  return {
    currentRpc: state.currentRpc,
    isHealthy,
    isFailingOver: state.isFailingOver,
    healthStatuses,
    failover,
    executeWithFailover,
    checkHealth,
    resetFailedRpcs,
  };
};
