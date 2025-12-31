import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, eachDayOfInterval, format, startOfYear, eachMonthOfInterval, endOfMonth, formatDistanceToNow } from "date-fns";

interface ViewerDataPoint {
  date: string;
  viewers: number;
}

interface EarningsDataPoint {
  date: string;
  amount: number;
}

interface RecentStream {
  id: string;
  title: string;
  category: string | null;
  viewers: number;
  duration: string;
  date: string;
}

interface RecentDonation {
  id: string;
  from: string;
  amount: number;
  message: string | null;
  date: string;
}

interface DashboardAnalytics {
  viewerData: ViewerDataPoint[];
  earningsData: EarningsDataPoint[];
  recentStreams: RecentStream[];
  recentDonations: RecentDonation[];
  isLoading: boolean;
  refetch: () => void;
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export function useDashboardAnalytics(userId: string | undefined): DashboardAnalytics {
  const [viewerData, setViewerData] = useState<ViewerDataPoint[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsDataPoint[]>([]);
  const [recentStreams, setRecentStreams] = useState<RecentStream[]>([]);
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      const now = new Date();
      
      // Fetch weekly viewer analytics (last 7 days)
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
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

      // Fetch recent streams
      const { data: streamsData } = await supabase
        .from("streams")
        .select("id, title, category, peak_viewers, duration_seconds, ended_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (streamsData) {
        setRecentStreams(streamsData.map(stream => ({
          id: stream.id,
          title: stream.title || "Untitled Stream",
          category: stream.category,
          viewers: stream.peak_viewers || 0,
          duration: formatDuration(stream.duration_seconds),
          date: formatDistanceToNow(new Date(stream.ended_at || stream.created_at), { addSuffix: true })
        })));
      }

      // Fetch recent donations/earnings
      const { data: donationsData } = await supabase
        .from("earnings")
        .select("id, from_username, amount, message, created_at")
        .eq("user_id", userId)
        .eq("type", "tip")
        .order("created_at", { ascending: false })
        .limit(5);

      if (donationsData) {
        setRecentDonations(donationsData.map(donation => ({
          id: donation.id,
          from: donation.from_username || "Anonymous",
          amount: Number(donation.amount),
          message: donation.message,
          date: formatDistanceToNow(new Date(donation.created_at), { addSuffix: true })
        })));
      }
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
          event: '*',
          schema: 'public',
          table: 'stream_analytics',
          filter: `user_id=eq.${userId}`
        },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'earnings',
          filter: `user_id=eq.${userId}`
        },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streams',
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
    recentStreams,
    recentDonations,
    isLoading,
    refetch: fetchAnalytics
  };
}
