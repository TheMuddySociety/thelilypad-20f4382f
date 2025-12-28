import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LaunchpadStats {
  totalCollections: number;
  liveNow: number;
  nftsMinted: number;
  totalVolume: number;
}

export const useLaunchpadStats = () => {
  const [stats, setStats] = useState<LaunchpadStats>({
    totalCollections: 0,
    liveNow: 0,
    nftsMinted: 0,
    totalVolume: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [collectionsResult, liveResult, mintedResult, volumeResult] = await Promise.all([
        supabase.from("collections").select("id", { count: "exact", head: true }),
        supabase.from("collections").select("id", { count: "exact", head: true }).eq("status", "live"),
        supabase.from("minted_nfts").select("id", { count: "exact", head: true }),
        supabase.from("nft_listings").select("price").eq("status", "sold"),
      ]);

      const totalVolume = volumeResult.data?.reduce((sum, listing) => sum + (listing.price || 0), 0) || 0;

      setStats({
        totalCollections: collectionsResult.count || 0,
        liveNow: liveResult.count || 0,
        nftsMinted: mintedResult.count || 0,
        totalVolume,
      });
    } catch (error) {
      console.error("Error fetching launchpad stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up realtime subscriptions
    const channel = supabase
      .channel("launchpad-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "collections" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "minted_nfts" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "nft_listings" }, fetchStats)
      .subscribe();

    // Auto-refresh fallback every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return { stats, isLoading, refetch: fetchStats };
};
