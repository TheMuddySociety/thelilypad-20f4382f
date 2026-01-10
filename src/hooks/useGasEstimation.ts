// Gas Estimation - Monad Coming Soon
import { useState, useCallback } from "react";

interface GasEstimate { gasLimit: number; gasPrice: number; totalGas: number; }
interface UseGasEstimationProps { contractAddress: string | null; mintAmount: number; pricePerNft: string; requiresAllowlist?: boolean; allowlistAddresses?: string[]; generateMerkleProof?: (address: string, addresses: string[]) => string[]; }

export const useGasEstimation = (_props: UseGasEstimationProps) => {
  const [gasEstimate] = useState<GasEstimate | null>(null);
  const [isEstimating] = useState(false);
  const [error] = useState<string | null>(null);
  const refetch = useCallback(() => {}, []);
  return { gasEstimate, isEstimating, error, refetch, isMonadSupported: false };
};
