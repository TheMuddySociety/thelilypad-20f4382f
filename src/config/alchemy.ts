import { defineChain } from "viem";

// Network type
export type NetworkType = "mainnet" | "testnet";

// RPC endpoints with rate limits (ordered by reliability)
export const MONAD_TESTNET_RPCS = [
  "https://testnet-rpc.monad.xyz",
  "https://rpc.ankr.com/monad_testnet",
];

export const MONAD_MAINNET_RPCS = [
  "https://rpc1.monad.xyz",       // Alchemy - generally more reliable
  "https://rpc.monad.xyz",        // QuickNode - 25 rps
  "https://rpc3.monad.xyz",       // Ankr - 300 per 10s
  "https://monad.drpc.org",       // dRPC fallback
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

export const checkRpcHealth = async (rpcUrl: string, timeout = 5000): Promise<RpcHealthStatus> => {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
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
      return { url: rpcUrl, healthy: false, latency, error: data.error.message };
    }
    
    return { url: rpcUrl, healthy: true, latency };
  } catch (error: any) {
    return { 
      url: rpcUrl, 
      healthy: false, 
      latency: null, 
      error: error.name === 'AbortError' ? 'Timeout' : error.message 
    };
  }
};

export const checkAllRpcsHealth = async (network: NetworkType): Promise<RpcHealthStatus[]> => {
  const rpcs = network === 'mainnet' ? MONAD_MAINNET_RPCS : MONAD_TESTNET_RPCS;
  return Promise.all(rpcs.map(url => checkRpcHealth(url)));
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
