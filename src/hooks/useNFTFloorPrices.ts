import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NFT } from "./useWalletNFTs";

interface FloorPriceData {
  contractAddress: string;
  floorPrice: number | null;
  currency: string;
  marketplace: string;
}

interface UseNFTFloorPricesResult {
  totalValue: number;
  floorPrices: Map<string, FloorPriceData>;
  isLoading: boolean;
  error: string | null;
  currency: string;
  refresh: () => Promise<void>;
}

export function useNFTFloorPrices(
  nfts: NFT[],
  network: string
): UseNFTFloorPricesResult {
  const [floorPrices, setFloorPrices] = useState<Map<string, FloorPriceData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrency = (network: string): string => {
    switch (network) {
      case 'polygon-mainnet':
        return 'MATIC';
      case 'solana-mainnet':
        return 'SOL';
      default:
        return 'ETH';
    }
  };

  const fetchFloorPrices = useCallback(async () => {
    if (nfts.length === 0) {
      setFloorPrices(new Map());
      return;
    }

    // Extract unique contract addresses
    const contractAddresses = [...new Set(nfts.map(nft => nft.contractAddress))];
    
    if (contractAddresses.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-nft-floor-prices", {
        body: {
          contractAddresses,
          network,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to fetch floor prices");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const priceMap = new Map<string, FloorPriceData>();
      for (const fp of data.floorPrices || []) {
        priceMap.set(fp.contractAddress.toLowerCase(), fp);
      }
      
      setFloorPrices(priceMap);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch floor prices";
      setError(message);
      console.error("Error fetching floor prices:", err);
    } finally {
      setIsLoading(false);
    }
  }, [nfts, network]);

  // Calculate total value
  const totalValue = Array.from(floorPrices.values()).reduce((sum, fp) => {
    if (fp.floorPrice === null) return sum;
    // Count how many NFTs we have from this collection
    const nftCount = nfts.filter(
      nft => nft.contractAddress.toLowerCase() === fp.contractAddress.toLowerCase()
    ).length;
    return sum + (fp.floorPrice * nftCount);
  }, 0);

  useEffect(() => {
    fetchFloorPrices();
  }, [fetchFloorPrices]);

  return {
    totalValue,
    floorPrices,
    isLoading,
    error,
    currency: getCurrency(network),
    refresh: fetchFloorPrices,
  };
}
