// Solalna RPC endpoints

// Solana RPC endpoints
export const SOLANA_DEVNET_RPC = "https://api.devnet.solana.com";
export const SOLANA_MAINNET_RPC = "https://api.mainnet-beta.solana.com";

// Monad RPC endpoints
export const MONAD_TESTNET_RPCS = [
  "https://testnet-rpc.monad.xyz",
  "https://monad-testnet.blockvision.org/v1/37hH1sm8QDkbsAYrBsU9EjXwZ0o",
  "https://rpc.ankr.com/monad_testnet",
  "https://monad.drpc.org"
];

export const MONAD_MAINNET_RPCS = [
  "https://rpc1.monad.xyz",
  "https://rpc.monad.xyz",
  "https://rpc3.monad.xyz"
];

export const getSolanaRpcUrl = (network: NetworkType): string => {
  return network === "mainnet" ? SOLANA_MAINNET_RPC : SOLANA_DEVNET_RPC;
};

// Simple health check for Solana RPC
export interface RpcHealthStatus {
  url: string;
  healthy: boolean;
  latency: number | null;
  error?: string;
}

export const checkRpcHealth = async (rpcUrl: string, timeout = 5000): Promise<RpcHealthStatus> => {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth", params: [] }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latency = Date.now() - start;
    if (!response.ok) {
      return { url: rpcUrl, healthy: false, latency, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    if (data.result === "ok") {
      return { url: rpcUrl, healthy: true, latency };
    }
    return { url: rpcUrl, healthy: false, latency, error: "Unexpected response" };
  } catch (e) {
    return { url: rpcUrl, healthy: false, latency: null, error: (e as Error).message };
  }
};

export const getBestRpc = async (network: NetworkType): Promise<string | null> => {
  const rpcUrl = getSolanaRpcUrl(network);
  const health = await checkRpcHealth(rpcUrl);
  return health.healthy ? rpcUrl : null;
};

// Network type
export type NetworkType = "mainnet" | "testnet";

// Get preferred RPC from localStorage
export const getPreferredRpcUrl = (network: NetworkType = "testnet"): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`preferredRpc_${network}`);
  }
  return null;
};

// Get RPC URL based on network type
export const getRpcUrl = (network: NetworkType = "testnet"): string => {
  const preferred = getPreferredRpcUrl(network);
  if (preferred) return preferred;
  return getSolanaRpcUrl(network);
};
