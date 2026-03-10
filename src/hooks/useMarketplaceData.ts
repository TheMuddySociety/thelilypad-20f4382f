import { useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTableSubscription } from "./useRealtimeSubscription";
import { useInfiniteScroll } from "./useInfiniteScroll";
import { getCollectionPrice as getPriceFromUtils } from "@/lib/chainUtils";
import { getDbChainValues, type SupportedChain } from "@/config/chains";

const ITEMS_PER_PAGE = 12;

export type ChainFilter = "all" | SupportedChain;

export interface Collection {
  id: string;
  name: string;
  image_url: string | null;
  creator_address: string;
  total_supply: number;
  minted: number;
  status: string;
  phases: unknown;
  royalty_percent: number;
  created_at: string;
  contract_address: string | null;
  chain: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_mon: number;
  category: string;
  tier: string;
  total_sales: number;
  creator_id: string;
  is_active: boolean;
  created_at: string;
}

export interface NFTListing {
  id: string;
  nft_id: string;
  seller_id: string;
  seller_address: string;
  price: number;
  currency: string;
  chain: string;
  created_at: string;
  expires_at: string | null;
  nft: {
    id: string;
    token_id: number;
    name: string | null;
    image_url: string | null;
    collection_id: string | null;
    owner_address: string;
    contract_address?: string; // Added for Solana Core Asset Address
    collection?: {
      name: string;
      contract_address: string | null;
    };
  };
}

interface MarketplaceBaseData {
  stickerPacks: ShopItem[];
  nftListings: NFTListing[];
  hotCollectionMints: Map<string, number>;
}

async function fetchBaseMarketplaceData(): Promise<MarketplaceBaseData> {
  // Fetch recent mints (last 24 hours) to determine "hot" collections
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentMints, error: mintsError } = await supabase
    .from("minted_nfts")
    .select("collection_id")
    .gte("minted_at", twentyFourHoursAgo);

  let hotMints = new Map<string, number>();
  if (!mintsError && recentMints) {
    const mintCounts = recentMints.reduce((acc, mint) => {
      if (mint.collection_id) {
        acc[mint.collection_id] = (acc[mint.collection_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    hotMints = new Map(
      (Object.entries(mintCounts) as [string, number][]).filter(([_, count]) => count >= 3)
    );
  }

  // Fetch sticker packs
  const { data: stickersData, error: stickersError } = await supabase
    .from("shop_items")
    .select("*")
    .eq("category", "sticker_pack")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (stickersError) {
    console.error("Error fetching sticker packs:", stickersError);
  }

  // Fetch active NFT listings
  const { data: listingsData, error: listingsError } = await supabase
    .from("nft_listings")
    .select(`
      *,
      nft:minted_nfts(
        id,
        token_id,
        name,
        image_url,
        collection_id,
        owner_address,
        collection:collections(name, contract_address, chain)
      )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (listingsError) {
    console.error("Error fetching listings:", listingsError);
  }

  // Transform listings data
  const transformedListings = (listingsData || [])
    .map((listing) => {
      const nft = listing.nft;
      const collection = nft?.collection as any;
      const chain = collection?.chain || 'solana';

      return {
        ...listing,
        chain,
        nft: nft
          ? {
            ...nft,
            collection: collection,
          }
          : null,
      };
    })
    .filter((listing) => listing.nft !== null) as NFTListing[];

  return {
    stickerPacks: stickersData || [],
    nftListings: transformedListings,
    hotCollectionMints: hotMints,
  };
}

import { getDecentralizedIndex, type IndexedCollection } from "@/integrations/arweave/indexClient";

async function fetchCollectionsPage(pageParam: number, chain: ChainFilter): Promise<{ collections: Collection[]; nextPage: number | undefined }> {
  // 1. Fetch from Decentralized Index (Arweave)
  let arweaveCollections: Collection[] = [];
  try {
    const indexRoot = import.meta.env.VITE_INDEX_ROOT_TX;
    const dex = await getDecentralizedIndex(indexRoot);
    arweaveCollections = dex.collections.map(c => ({
      id: c.id,
      name: c.name,
      image_url: c.image_url,
      creator_address: c.creator_address,
      total_supply: 0, // Metadata only
      minted: 0,
      status: "live",
      phases: {},
      royalty_percent: 0,
      created_at: c.created_at,
      contract_address: c.contract_address,
      chain: c.chain
    }));
  } catch (e) {
    console.warn("Failed to fetch decentralized index:", e);
  }

  // 2. Fetch from Supabase (if available)
  let supabaseCollections: Collection[] = [];
  try {
    let query = supabase
      .from("collections")
      .select("*")
      .is("deleted_at", null)
      .in("status", ["active", "minting", "soldout", "live", "upcoming", "minted"])
      .order("created_at", { ascending: false });

    if (chain !== 'all') {
      query = query.in("chain", getDbChainValues(chain));
    }

    const { data, error } = await query.range(
      pageParam * ITEMS_PER_PAGE,
      (pageParam + 1) * ITEMS_PER_PAGE - 1
    );

    if (!error && data) {
      supabaseCollections = data as Collection[];
    }
  } catch (e) {
    console.warn("Supabase fetch failed", e);
  }

  // 3. Merge and De-duplicate (by contract address)
  const combined = [...arweaveCollections, ...supabaseCollections];
  const unique = combined.reduce((acc, current) => {
    const x = acc.find(item => item.contract_address === current.contract_address);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, [] as Collection[]);

  // 4. Handle paging for the combined list
  const start = pageParam * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const page = unique.slice(start, end);

  return {
    collections: page,
    nextPage: unique.length > end ? pageParam + 1 : undefined,
  };
}

export function useMarketplaceData(chain: ChainFilter = "solana") {
  const queryClient = useQueryClient();

  // Base data query (stickers, listings, hot collections)
  const baseQuery = useQuery({
    queryKey: ["marketplace-base-data"],
    queryFn: fetchBaseMarketplaceData,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Infinite collections query with chain filter
  const collectionsQuery = useInfiniteQuery({
    queryKey: ["marketplace-collections", chain],
    queryFn: ({ pageParam = 0 }) => fetchCollectionsPage(pageParam, chain),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Flatten all collection pages
  const allCollections = collectionsQuery.data?.pages.flatMap(page => page.collections) || [];

  // Load more function
  const loadMore = useCallback(() => {
    if (collectionsQuery.hasNextPage && !collectionsQuery.isFetchingNextPage) {
      collectionsQuery.fetchNextPage();
    }
  }, [collectionsQuery]);

  // Infinite scroll hook
  const { loadMoreRef } = useInfiniteScroll(
    loadMore,
    collectionsQuery.hasNextPage || false,
    collectionsQuery.isFetchingNextPage
  );

  // Realtime subscriptions for automatic updates
  useMultiTableSubscription(
    [
      { table: "collections", event: "*" },
      { table: "nft_listings", event: "*" },
      { table: "shop_items", event: "*" },
      { table: "minted_nfts", event: "INSERT" },
    ],
    () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-base-data"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-collections"] });
    },
    true
  );

  const refetch = useCallback(() => {
    baseQuery.refetch();
    return collectionsQuery.refetch();
  }, [baseQuery, collectionsQuery]);

  return {
    collections: allCollections,
    stickerPacks: baseQuery.data?.stickerPacks ?? [],
    nftListings: baseQuery.data?.nftListings ?? [],
    hotCollectionMints: baseQuery.data?.hotCollectionMints ?? new Map(),
    totalCollections: allCollections.length,
    isLoading: baseQuery.isLoading || collectionsQuery.isLoading,
    isFetchingMore: collectionsQuery.isFetchingNextPage,
    isError: baseQuery.isError || collectionsQuery.isError,
    error: baseQuery.error || collectionsQuery.error,
    hasMore: collectionsQuery.hasNextPage || false,
    loadMoreRef,
    refetch,
  };
}

// Helper function to get price from phases
export function getCollectionPrice(collection: Collection): string {
  return getPriceFromUtils(collection);
}

// Helper to check if collection is "new" (created in last 7 days and live)
export function isCollectionNew(collection: Collection): boolean {
  return (
    collection.status === "live" &&
    new Date(collection.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  );
}
