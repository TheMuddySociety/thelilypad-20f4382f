import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NFT {
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  attributes: Array<{ trait_type: string; value: string }>;
}

interface UseWalletNFTsResult {
  nfts: NFT[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWalletNFTs(
  walletAddress: string | null,
  network: string = "eth-mainnet"
): UseWalletNFTsResult {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageKey, setPageKey] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  const fetchNFTs = useCallback(async (loadMore = false) => {
    if (!walletAddress) {
      setNfts([]);
      setTotalCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-nfts", {
        body: {
          walletAddress,
          network,
          pageKey: loadMore ? pageKey : undefined,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to fetch NFTs");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const newNfts = data.nfts || [];
      
      if (loadMore) {
        setNfts((prev) => [...prev, ...newNfts]);
      } else {
        setNfts(newNfts);
      }
      
      setTotalCount(data.totalCount || 0);
      setPageKey(data.pageKey);
      setHasMore(!!data.pageKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch NFTs";
      setError(message);
      console.error("Error fetching NFTs:", err);
      
      // Only show toast on initial load failure, not on load more
      if (!loadMore) {
        toast.error("Failed to load NFTs");
      }
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, network, pageKey]);

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await fetchNFTs(true);
    }
  }, [fetchNFTs, hasMore, isLoading]);

  const refresh = useCallback(async () => {
    setPageKey(undefined);
    await fetchNFTs(false);
  }, [fetchNFTs]);

  useEffect(() => {
    fetchNFTs(false);
  }, [walletAddress, network]);

  return {
    nfts,
    totalCount,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}