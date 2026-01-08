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

// Check if network is Solana
const isSolanaNetwork = (network: string) => 
  network === "solana-mainnet" || network === "solana-devnet";

export function useWalletNFTs(
  walletAddress: string | null,
  network: string = "eth-mainnet"
): UseWalletNFTsResult {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageKey, setPageKey] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
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
      const isSolana = isSolanaNetwork(network);
      
      const { data, error: fnError } = await supabase.functions.invoke("fetch-nfts", {
        body: {
          walletAddress,
          network,
          pageKey: loadMore && !isSolana ? pageKey : undefined,
          page: loadMore && isSolana ? currentPage + 1 : 1,
          isDevnet: network === "solana-devnet",
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
        if (isSolana) {
          setCurrentPage(data.page || currentPage + 1);
        }
      } else {
        setNfts(newNfts);
        setCurrentPage(1);
      }
      
      setTotalCount(data.totalCount || 0);
      setPageKey(data.pageKey);
      setHasMore(isSolana ? data.hasMore : !!data.pageKey);
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
  }, [walletAddress, network, pageKey, currentPage]);

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await fetchNFTs(true);
    }
  }, [fetchNFTs, hasMore, isLoading]);

  const refresh = useCallback(async () => {
    setPageKey(undefined);
    setCurrentPage(1);
    setNfts([]);
    await fetchNFTs(false);
  }, [fetchNFTs]);

  // Reset and fetch when wallet or network changes
  useEffect(() => {
    setNfts([]);
    setPageKey(undefined);
    setCurrentPage(1);
    setHasMore(false);
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

// Hook to fetch a single Solana asset
export function useSolanaAsset(assetAddress: string | null, isDevnet: boolean = true) {
  const [asset, setAsset] = useState<NFT | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAsset = useCallback(async () => {
    if (!assetAddress) {
      setAsset(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-nfts", {
        body: {
          assetAddress,
          network: isDevnet ? "solana-devnet" : "solana-mainnet",
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to fetch asset");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAsset(data.asset || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch asset";
      setError(message);
      console.error("Error fetching Solana asset:", err);
    } finally {
      setIsLoading(false);
    }
  }, [assetAddress, isDevnet]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  return { asset, isLoading, error, refresh: fetchAsset };
}

// Hook to fetch a Solana collection
export function useSolanaCollection(collectionAddress: string | null, isDevnet: boolean = true) {
  const [collection, setCollection] = useState<{
    address: string;
    name: string;
    symbol: string;
    description: string;
    image: string;
    updateAuthority: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollection = useCallback(async () => {
    if (!collectionAddress) {
      setCollection(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-nfts", {
        body: {
          collectionAddress,
          network: isDevnet ? "solana-devnet" : "solana-mainnet",
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to fetch collection");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setCollection(data.collection || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch collection";
      setError(message);
      console.error("Error fetching Solana collection:", err);
    } finally {
      setIsLoading(false);
    }
  }, [collectionAddress, isDevnet]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  return { collection, isLoading, error, refresh: fetchCollection };
}
