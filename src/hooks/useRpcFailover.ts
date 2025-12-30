import { useState, useEffect, useCallback, useRef } from "react";
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

export const useRpcFailover = (network: NetworkType): UseRpcFailoverReturn => {
  const rpcs = getRpcUrls(network);
  const preferredRpc = getPreferredRpcUrl(network);
  
  const [state, setState] = useState<RpcFailoverState>({
    currentRpc: lastSuccessfulRpc[network] || preferredRpc || rpcs[0],
    isFailingOver: false,
    failedRpcs: globalFailedRpcs[network],
    lastHealthCheck: null,
  });
  
  const [healthStatuses, setHealthStatuses] = useState<RpcHealthStatus[]>([]);
  const [isHealthy, setIsHealthy] = useState(true);
  
  const failoverInProgress = useRef(false);
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Check health of all RPCs
  const checkHealth = useCallback(async () => {
    const results = await Promise.all(rpcs.map(url => checkRpcHealth(url, 5000)));
    setHealthStatuses(results);
    
    // Update failed RPCs based on health check
    const newFailedRpcs = new Set<string>();
    results.forEach(result => {
      if (!result.healthy) {
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
  }, [network, rpcs, state.currentRpc]);

  // Find next healthy RPC
  const findHealthyRpc = useCallback(async (): Promise<string | null> => {
    const availableRpcs = rpcs.filter(url => !globalFailedRpcs[network].has(url));
    
    // Check health of available RPCs in order
    for (const rpcUrl of availableRpcs) {
      const health = await checkRpcHealth(rpcUrl, 3000);
      if (health.healthy) {
        return rpcUrl;
      } else {
        globalFailedRpcs[network].add(rpcUrl);
      }
    }
    
    // If all RPCs failed, try resetting and checking again
    if (globalFailedRpcs[network].size === rpcs.length) {
      console.log("All RPCs marked as failed, resetting...");
      globalFailedRpcs[network].clear();
      
      // Try the first RPC again
      const health = await checkRpcHealth(rpcs[0], 3000);
      if (health.healthy) {
        return rpcs[0];
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
      // Mark current RPC as failed
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
        
        // Mark RPC as successful
        globalFailedRpcs[network].delete(currentRpcUrl);
        lastSuccessfulRpc[network] = currentRpcUrl;
        
        if (currentRpcUrl !== state.currentRpc) {
          setState(prev => ({ ...prev, currentRpc: currentRpcUrl }));
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Check if this is an RPC-related error
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
        
        // Non-RPC error or no healthy RPC found
        throw error;
      }
    }
    
    throw lastError || new Error("Operation failed after retries");
  }, [network, state.currentRpc, findHealthyRpc]);

  // Reset failed RPCs
  const resetFailedRpcs = useCallback(() => {
    globalFailedRpcs[network].clear();
    setState(prev => ({
      ...prev,
      failedRpcs: new Set(),
    }));
  }, [network]);

  // Periodic health check
  useEffect(() => {
    checkHealth();
    
    healthCheckInterval.current = setInterval(checkHealth, 30000);
    
    return () => {
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
