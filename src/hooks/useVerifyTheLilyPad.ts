import { useState, useCallback } from "react";
import { THELILYPAD_ABI, THELILYPAD_CONTRACT_ADDRESS } from "@/config/theLilyPad";
import { encodeFunctionData } from "viem";
import { NetworkType } from "@/config/alchemy";

// RPC Proxy base URL
const RPC_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rpc-proxy`;

// Make RPC call through the proxy
const rpcProxyCall = async (
  network: NetworkType,
  method: string,
  params: any[]
): Promise<any> => {
  const response = await fetch(`${RPC_PROXY_URL}?network=${network}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC Proxy error: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }

  return data.result;
};

interface VerificationResult {
  isLilyPadCollection: boolean;
  platformName: string | null;
  version: string | null;
  treasury: string | null;
  buyback: string | null;
}

export function useVerifyTheLilyPad(network: NetworkType = 'testnet') {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify if a contract address is the TheLilyPad contract or a LilyPad collection
  const verifyContract = useCallback(async (contractAddress: string): Promise<VerificationResult> => {
    setIsVerifying(true);
    setError(null);

    try {
      // First check if it's the main TheLilyPad contract
      if (contractAddress.toLowerCase() === THELILYPAD_CONTRACT_ADDRESS.toLowerCase()) {
        // Verify by calling isLilyPadCollection
        const isLilyPadData = encodeFunctionData({
          abi: THELILYPAD_ABI,
          functionName: "isLilyPadCollection",
          args: [],
        });

        const isLilyPadResult = await rpcProxyCall(network, 'eth_call', [{
          to: contractAddress,
          data: isLilyPadData,
        }, 'latest']);

        const isLilyPad = BigInt(isLilyPadResult) === 1n;

        if (isLilyPad) {
          setIsVerifying(false);
          return {
            isLilyPadCollection: true,
            platformName: "LilyPad",
            version: "1.0.0",
            treasury: null,
            buyback: null,
          };
        }
      }

      // Try to verify any contract as a LilyPad collection
      try {
        const isLilyPadData = encodeFunctionData({
          abi: THELILYPAD_ABI,
          functionName: "isLilyPadCollection",
          args: [],
        });

        const result = await rpcProxyCall(network, 'eth_call', [{
          to: contractAddress,
          data: isLilyPadData,
        }, 'latest']);

        const isLilyPad = BigInt(result) === 1n;

        setIsVerifying(false);
        return {
          isLilyPadCollection: isLilyPad,
          platformName: isLilyPad ? "LilyPad" : null,
          version: isLilyPad ? "1.0.0" : null,
          treasury: null,
          buyback: null,
        };
      } catch {
        // Contract doesn't have isLilyPadCollection function
        setIsVerifying(false);
        return {
          isLilyPadCollection: false,
          platformName: null,
          version: null,
          treasury: null,
          buyback: null,
        };
      }

    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message);
      setIsVerifying(false);
      return {
        isLilyPadCollection: false,
        platformName: null,
        version: null,
        treasury: null,
        buyback: null,
      };
    }
  }, [network]);

  // Quick check if address matches the deployed TheLilyPad contract
  const isMainContract = useCallback((contractAddress: string): boolean => {
    return contractAddress.toLowerCase() === THELILYPAD_CONTRACT_ADDRESS.toLowerCase();
  }, []);

  return {
    verifyContract,
    isMainContract,
    isVerifying,
    error,
    contractAddress: THELILYPAD_CONTRACT_ADDRESS,
  };
}
