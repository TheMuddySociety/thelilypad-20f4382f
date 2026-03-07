import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlatformStats {
  totalCollections: number;
  liveNow: number;
  nftsMinted: number;
  totalVolume: number;
}

export const usePlatformStats = () => {
  const [stats, setStats] = useState<PlatformStats>({
    totalCollections: 0,
    liveNow: 0,
    nftsMinted: 0,
    totalVolume: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_platform_stats' as any);
      if (error) throw error;

      const result = data as any;
      setStats({
        totalCollections: result?.totalCollections || 0,
        liveNow: result?.liveNow || 0,
        nftsMinted: result?.nftsMinted || 0,
        totalVolume: result?.totalVolume || 0,
      });
    } catch (error) {
      console.error("Error fetching platform stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up realtime subscriptions (we keep it to auto-update visually but it will trigger less queries now)
    const channel = supabase
      .channel("platform-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "collections" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "streams" }, fetchStats)
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

  return { stats, isLoading };
};

