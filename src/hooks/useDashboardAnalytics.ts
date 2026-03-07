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
      const { data, error } = await supabase.rpc('get_dashboard_analytics' as any, {
        target_user_id: userId
      });

      if (error) throw error;

      const result = data as any;
      if (result) {
        setViewerData(result.viewerData || []);
        setEarningsData(result.earningsData || []);

        // Format streams
        if (result.recentStreams) {
          setRecentStreams(result.recentStreams.map((stream: any) => ({
            id: stream.id,
            title: stream.title,
            category: stream.category,
            viewers: stream.viewers,
            duration: formatDuration(stream.duration_seconds),
            date: formatDistanceToNow(new Date(stream.ended_at || stream.created_at), { addSuffix: true })
          })));
        }

        // Format donations
        if (result.recentDonations) {
          setRecentDonations(result.recentDonations.map((donation: any) => ({
            id: donation.id,
            from: donation.from,
            amount: Number(donation.amount),
            message: donation.message,
            date: formatDistanceToNow(new Date(donation.created_at), { addSuffix: true })
          })));
        }
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
