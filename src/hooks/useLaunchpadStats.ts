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
      const { data, error } = await supabase.rpc('get_launchpad_stats' as any);
      if (error) throw error;

      const result = data as any;
      setStats({
        totalCollections: result?.totalCollections || 0,
        liveNow: result?.liveNow || 0,
        nftsMinted: result?.nftsMinted || 0,
        totalVolume: result?.totalVolume || 0,
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
