import { defineChain } from "viem";
import { isAbortError, getErrorMessage } from "@/lib/errorUtils";

// Network type
export type NetworkType = "mainnet" | "testnet";

// RPC endpoints with rate limits (ordered by reliability)
export const MONAD_TESTNET_RPCS = [
  "https://monad-testnet.blockvision.org/v1/37hH1sm8QDkbsAYrBsU9EjXwZ0o", // BlockVision (primary)
  "https://testnet-rpc.monad.xyz",
  "https://rpc.ankr.com/monad_testnet",
];

export const MONAD_MAINNET_RPCS = [
  "https://rpc.monad.xyz",        // QuickNode - 25 rps (most reliable)
  "https://rpc1.monad.xyz",       // Alchemy - 15 rps
  "https://rpc3.monad.xyz",       // Ankr - 300 per 10s
  "https://rpc-mainnet.monadinfra.com", // MF - historical state support
];

// Primary RPC URLs (for backwards compatibility)
export const MONAD_TESTNET_RPC = MONAD_TESTNET_RPCS[0];
export const MONAD_MAINNET_RPC = MONAD_MAINNET_RPCS[0];

// RPC Health check utility
export interface RpcHealthStatus {
  url: string;
  healthy: boolean;
  latency: number | null;
  error?: string;
}

// Expected chain IDs for validation
const EXPECTED_CHAIN_IDS: Record<NetworkType, number> = {
  mainnet: 143,
  testnet: 10143,
};

export const checkRpcHealth = async (
  rpcUrl: string, 
  timeout = 5000,
  network: NetworkType = 'mainnet'
): Promise<RpcHealthStatus> => {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Use eth_chainId - universally supported and validates we're on correct network
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_chainId',
        params: [],
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      return { url: rpcUrl, healthy: false, latency, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    if (data.error) {
      // Some RPCs might not support eth_chainId, fallback to eth_blockNumber
      return await checkRpcHealthFallback(rpcUrl, timeout - latency, latency);
    }
    
    // Validate chain ID matches expected network
    const chainId = parseInt(data.result, 16);
    const expectedChainId = EXPECTED_CHAIN_IDS[network];
    
    if (chainId !== expectedChainId) {
      return { 
        url: rpcUrl, 
        healthy: false, 
        latency, 
        error: `Wrong chain: ${chainId} (expected ${expectedChainId})` 
      };
    }
    
    return { url: rpcUrl, healthy: true, latency };
  } catch (error: unknown) {
    return { 
      url: rpcUrl, 
      healthy: false, 
      latency: null, 
      error: isAbortError(error) ? 'Timeout' : getErrorMessage(error) 
    };
  }
};

// Fallback health check using eth_blockNumber
const checkRpcHealthFallback = async (
  rpcUrl: string, 
  timeout: number,
  existingLatency: number
): Promise<RpcHealthStatus> => {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Math.max(timeout, 2000));
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_blockNumber',
        params: [],
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const totalLatency = existingLatency + (Date.now() - startTime);
    
    if (!response.ok) {
      return { url: rpcUrl, healthy: false, latency: totalLatency, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    if (data.error) {
      return { url: rpcUrl, healthy: false, latency: totalLatency, error: data.error.message };
    }
    
    // Check if we got a valid block number
    if (data.result && typeof data.result === 'string' && data.result.startsWith('0x')) {
      return { url: rpcUrl, healthy: true, latency: totalLatency };
    }
    
    return { url: rpcUrl, healthy: false, latency: totalLatency, error: 'Invalid response' };
  } catch (error: unknown) {
    return { 
      url: rpcUrl, 
      healthy: false, 
      latency: null, 
      error: isAbortError(error) ? 'Timeout' : getErrorMessage(error) 
    };
  }
};

export const checkAllRpcsHealth = async (network: NetworkType): Promise<RpcHealthStatus[]> => {
  const rpcs = network === 'mainnet' ? MONAD_MAINNET_RPCS : MONAD_TESTNET_RPCS;
  return Promise.all(rpcs.map(url => checkRpcHealth(url, 5000, network)));
};

export const getBestRpc = async (network: NetworkType): Promise<string | null> => {
  const healthResults = await checkAllRpcsHealth(network);
  const healthyRpcs = healthResults
    .filter(r => r.healthy && r.latency !== null)
    .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity));
  
  return healthyRpcs.length > 0 ? healthyRpcs[0].url : null;
};

// Monad Mainnet chain configuration
export const monadMainnet = defineChain({
  id: 143, // Official Monad Mainnet chain ID
  name: "Monad Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: MONAD_MAINNET_RPCS,
    },
    public: {
      http: MONAD_MAINNET_RPCS,
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://monadvision.com",
    },
  },
});

// Monad Testnet chain configuration
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: MONAD_TESTNET_RPCS,
    },
    public: {
      http: MONAD_TESTNET_RPCS,
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision Testnet",
      url: "https://testnet.monadvision.com",
    },
  },
});

// Get chain config based on network type
export const getMonadChain = (network: NetworkType) => 
  network === "mainnet" ? monadMainnet : monadTestnet;

// Get preferred RPC from localStorage
export const getPreferredRpcUrl = (network: NetworkType = "testnet"): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`preferredRpc_${network}`);
  }
  return null;
};

// Get RPC URL based on network type (respects user preference)
export const getRpcUrl = (network: NetworkType = "testnet"): string => {
  const preferred = getPreferredRpcUrl(network);
  if (preferred) return preferred;
  return network === "mainnet" ? MONAD_MAINNET_RPC : MONAD_TESTNET_RPC;
};

// Get all RPC URLs for fallback (preferred first if set)
export const getRpcUrls = (network: NetworkType = "testnet"): string[] => {
  const rpcs = network === "mainnet" ? MONAD_MAINNET_RPCS : MONAD_TESTNET_RPCS;
  const preferred = getPreferredRpcUrl(network);
  
  if (preferred && rpcs.includes(preferred)) {
    // Move preferred to front of the list
    return [preferred, ...rpcs.filter(r => r !== preferred)];
  }
  
  return rpcs;
};
