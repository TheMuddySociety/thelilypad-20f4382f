import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, Eye, Share2, Code, TrendingUp, 
  Twitter, Facebook, MessageCircle, Link, Globe 
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface ClipAnalyticsProps {
  clipId: string;
  clipTitle: string;
}

interface AnalyticsData {
  totalViews: number;
  totalShares: number;
  totalEmbeds: number;
  sharesByPlatform: Record<string, number>;
  viewsOverTime: { date: string; views: number }[];
  sharesOverTime: { date: string; shares: number }[];
}

const platformConfig: Record<string, { icon: typeof Twitter; color: string; label: string }> = {
  twitter: { icon: Twitter, color: "#1DA1F2", label: "Twitter/X" },
  facebook: { icon: Facebook, color: "#4267B2", label: "Facebook" },
  discord: { icon: MessageCircle, color: "#5865F2", label: "Discord" },
  reddit: { icon: Link, color: "#FF4500", label: "Reddit" },
  link: { icon: Link, color: "#10B981", label: "Link Copy" },
  native: { icon: Globe, color: "#8B5CF6", label: "Native Share" },
};

export const ClipAnalytics = ({ clipId, clipTitle }: ClipAnalyticsProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalShares: 0,
    totalEmbeds: 0,
    sharesByPlatform: {},
    viewsOverTime: [],
    sharesOverTime: [],
  });

  useEffect(() => {
    if (!open) return;

    const fetchAnalytics = async () => {
      setLoading(true);

      const thirtyDaysAgo = subDays(new Date(), 30);
      
      // Fetch all events for this clip
      const { data: events, error } = await supabase
        .from("clip_events")
        .select("event_type, platform, created_at")
        .eq("clip_id", clipId)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (error) {
        console.error("Error fetching analytics:", error);
        setLoading(false);
        return;
      }

      // Process events
      const views = events?.filter(e => e.event_type === "view") || [];
      const shares = events?.filter(e => e.event_type === "share") || [];
      const embeds = events?.filter(e => e.event_type === "embed_copy") || [];

      // Count shares by platform
      const sharesByPlatform: Record<string, number> = {};
      shares.forEach(share => {
        const platform = share.platform || "unknown";
        sharesByPlatform[platform] = (sharesByPlatform[platform] || 0) + 1;
      });

      // Generate dates for the last 30 days
      const dateRange = eachDayOfInterval({
        start: thirtyDaysAgo,
        end: new Date(),
      });

      // Count views by day
      const viewsByDay: Record<string, number> = {};
      const sharesByDay: Record<string, number> = {};
      
      dateRange.forEach(date => {
        const dateStr = format(date, "yyyy-MM-dd");
        viewsByDay[dateStr] = 0;
        sharesByDay[dateStr] = 0;
      });

      views.forEach(view => {
        const dateStr = format(new Date(view.created_at), "yyyy-MM-dd");
        if (viewsByDay[dateStr] !== undefined) {
          viewsByDay[dateStr]++;
        }
      });

      shares.forEach(share => {
        const dateStr = format(new Date(share.created_at), "yyyy-MM-dd");
        if (sharesByDay[dateStr] !== undefined) {
          sharesByDay[dateStr]++;
        }
      });

      const viewsOverTime = Object.entries(viewsByDay).map(([date, views]) => ({
        date: format(new Date(date), "MMM d"),
        views,
      }));

      const sharesOverTime = Object.entries(sharesByDay).map(([date, shares]) => ({
        date: format(new Date(date), "MMM d"),
        shares,
      }));

      setAnalytics({
        totalViews: views.length,
        totalShares: shares.length,
        totalEmbeds: embeds.length,
        sharesByPlatform,
        viewsOverTime,
        sharesOverTime,
      });

      setLoading(false);
    };

    fetchAnalytics();
  }, [clipId, open]);

  const statCards = [
    { 
      icon: Eye, 
      label: "Total Views", 
      value: analytics.totalViews, 
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    { 
      icon: Share2, 
      label: "Total Shares", 
      value: analytics.totalShares, 
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    { 
      icon: Code, 
      label: "Embed Copies", 
      value: analytics.totalEmbeds, 
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
  ];

  const platformData = Object.entries(analytics.sharesByPlatform).map(([platform, count]) => ({
    platform,
    count,
    config: platformConfig[platform] || { icon: Globe, color: "#6B7280", label: platform },
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <BarChart3 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Analytics for "{clipTitle}"
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border-border/50">
                    <CardContent className="p-4 text-center">
                      <div className={`inline-flex p-2 rounded-lg ${stat.bgColor} ${stat.color} mb-2`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Views Over Time Chart */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  Views Over Time (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.viewsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        allowDecimals={false}
                        className="text-muted-foreground"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Shares by Platform */}
            {platformData.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-emerald-500" />
                    Shares by Platform
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={platformData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <YAxis 
                          type="category" 
                          dataKey="platform" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => platformConfig[value]?.label || value}
                          width={80}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [value, "Shares"]}
                          labelFormatter={(label) => platformConfig[label]?.label || label}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {platformData.map((entry, index) => (
                            <Cell key={index} fill={entry.config.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Platform breakdown badges */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {platformData.map((item) => {
                      const Icon = item.config.icon;
                      return (
                        <Badge 
                          key={item.platform}
                          variant="secondary"
                          className="gap-1.5"
                          style={{ borderColor: item.config.color }}
                        >
                          <Icon className="h-3 w-3" style={{ color: item.config.color }} />
                          {item.config.label}: {item.count}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {analytics.totalViews === 0 && analytics.totalShares === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No analytics data yet</p>
                <p className="text-sm">Share your clip to start tracking engagement!</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
