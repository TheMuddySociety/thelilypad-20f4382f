import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, eachDayOfInterval, format, startOfYear, eachMonthOfInterval, endOfMonth } from "date-fns";

interface ViewerDataPoint {
  date: string;
  viewers: number;
}

interface EarningsDataPoint {
  date: string;
  amount: number;
}

interface DashboardAnalytics {
  viewerData: ViewerDataPoint[];
  earningsData: EarningsDataPoint[];
  isLoading: boolean;
  refetch: () => void;
}

export function useDashboardAnalytics(userId: string | undefined): DashboardAnalytics {
  const [viewerData, setViewerData] = useState<ViewerDataPoint[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      // Fetch weekly viewer analytics (last 7 days)
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const days = eachDayOfInterval({ start: weekStart, end: now });
      
      const viewerPromises = days.map(async (day) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const { data } = await supabase
          .from("stream_analytics")
          .select("concurrent_viewers")
          .eq("user_id", userId)
          .gte("recorded_at", dayStart.toISOString())
          .lte("recorded_at", dayEnd.toISOString());

        const avgViewers = data && data.length > 0
          ? Math.round(data.reduce((sum, d) => sum + d.concurrent_viewers, 0) / data.length)
          : 0;

        return {
          date: format(day, "EEE"),
          viewers: avgViewers
        };
      });

      const viewerResults = await Promise.all(viewerPromises);
      setViewerData(viewerResults);

      // Fetch monthly earnings (current year)
      const yearStart = startOfYear(now);
      const months = eachMonthOfInterval({ start: yearStart, end: now });

      const earningsPromises = months.map(async (month) => {
        const monthEnd = endOfMonth(month);
        
        const { data } = await supabase
          .from("earnings")
          .select("amount")
          .eq("user_id", userId)
          .gte("created_at", month.toISOString())
          .lte("created_at", monthEnd.toISOString());

        const totalAmount = data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

        return {
          date: format(month, "MMM"),
          amount: Math.round(totalAmount * 100) / 100
        };
      });

      const earningsResults = await Promise.all(earningsPromises);
      setEarningsData(earningsResults);
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Set up real-time subscription for analytics updates
  useEffect(() => {
    if (!userId) return;

    const analyticsChannel = supabase
      .channel('dashboard-analytics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_analytics',
          filter: `user_id=eq.${userId}`
        },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'earnings',
          filter: `user_id=eq.${userId}`
        },
        () => fetchAnalytics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(analyticsChannel);
    };
  }, [userId, fetchAnalytics]);

  return {
    viewerData,
    earningsData,
    isLoading,
    refetch: fetchAnalytics
  };
}
