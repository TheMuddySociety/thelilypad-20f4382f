import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, startOfWeek, eachDayOfInterval, eachWeekOfInterval } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

type TimeRange = '7d' | '30d' | '90d';
type ViewMode = 'daily' | 'weekly';

interface VolumeDataPoint {
  date: string;
  label: string;
  volume: number;
  weightedVolume: number;
  trades: number;
}

export function VolumeChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  const daysMap: Record<TimeRange, number> = { '7d': 7, '30d': 30, '90d': 90 };

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['volume-chart-data', timeRange],
    queryFn: async () => {
      const days = daysMap[timeRange];
      const startDate = subDays(new Date(), days).toISOString();

      const { data, error } = await supabase
        .from('volume_tracking')
        .select('created_at, volume_amount, weighted_volume, source_type')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const processedData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    const days = daysMap[timeRange];
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    if (viewMode === 'daily') {
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyData = new Map<string, { volume: number; weightedVolume: number; trades: number }>();

      // Initialize all days with zero
      dateRange.forEach(date => {
        const key = format(startOfDay(date), 'yyyy-MM-dd');
        dailyData.set(key, { volume: 0, weightedVolume: 0, trades: 0 });
      });

      // Aggregate data by day
      chartData.forEach(entry => {
        const key = format(startOfDay(new Date(entry.created_at)), 'yyyy-MM-dd');
        const existing = dailyData.get(key);
        if (existing) {
          dailyData.set(key, {
            volume: existing.volume + Number(entry.volume_amount),
            weightedVolume: existing.weightedVolume + Number(entry.weighted_volume),
            trades: existing.trades + 1,
          });
        }
      });

      return Array.from(dailyData.entries()).map(([date, stats]) => ({
        date,
        label: format(new Date(date), timeRange === '7d' ? 'EEE' : 'MMM d'),
        ...stats,
      }));
    } else {
      // Weekly view
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
      const weeklyData = new Map<string, { volume: number; weightedVolume: number; trades: number }>();

      weeks.forEach(weekStart => {
        const key = format(weekStart, 'yyyy-MM-dd');
        weeklyData.set(key, { volume: 0, weightedVolume: 0, trades: 0 });
      });

      chartData.forEach(entry => {
        const entryDate = new Date(entry.created_at);
        const weekStart = startOfWeek(entryDate, { weekStartsOn: 1 });
        const key = format(weekStart, 'yyyy-MM-dd');
        const existing = weeklyData.get(key);
        if (existing) {
          weeklyData.set(key, {
            volume: existing.volume + Number(entry.volume_amount),
            weightedVolume: existing.weightedVolume + Number(entry.weighted_volume),
            trades: existing.trades + 1,
          });
        }
      });

      return Array.from(weeklyData.entries()).map(([date, stats]) => ({
        date,
        label: `Week of ${format(new Date(date), 'MMM d')}`,
        ...stats,
      }));
    }
  }, [chartData, timeRange, viewMode]);

  const stats = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return { totalVolume: 0, avgVolume: 0, totalTrades: 0, trend: 0 };
    }

    const totalVolume = processedData.reduce((a, b) => a + b.weightedVolume, 0);
    const avgVolume = totalVolume / processedData.length;
    const totalTrades = processedData.reduce((a, b) => a + b.trades, 0);

    // Calculate trend (compare last period to previous)
    const midpoint = Math.floor(processedData.length / 2);
    const recentVolume = processedData.slice(midpoint).reduce((a, b) => a + b.weightedVolume, 0);
    const previousVolume = processedData.slice(0, midpoint).reduce((a, b) => a + b.weightedVolume, 0);
    const trend = previousVolume > 0 ? ((recentVolume - previousVolume) / previousVolume) * 100 : 0;

    return { totalVolume, avgVolume, totalTrades, trend };
  }, [processedData]);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toFixed(0);
  };

  const getTrendIcon = () => {
    if (Math.abs(stats.trend) < 1) return <Minus className="w-3 h-3" />;
    return stats.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (Math.abs(stats.trend) < 1) return "text-muted-foreground";
    return stats.trend > 0 ? "text-green-500" : "text-red-500";
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Volume Activity</CardTitle>
              <CardDescription>Platform trading volume over time</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="daily" className="text-xs px-2">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs px-2">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <TabsList className="h-8">
                <TabsTrigger value="7d" className="text-xs px-2">7D</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs px-2">30D</TabsTrigger>
                <TabsTrigger value="90d" className="text-xs px-2">90D</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Total Volume</div>
            <div className="text-lg font-bold">{formatVolume(stats.totalVolume)} MON</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
            <div className="text-lg font-bold">{stats.totalTrades.toLocaleString()}</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Trend</div>
            <div className={`text-lg font-bold flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              {Math.abs(stats.trend).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Chart */}
        {processedData.length > 0 ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'daily' ? (
                <AreaChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    interval={timeRange === '7d' ? 0 : 'preserveStartEnd'}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={formatVolume}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${formatVolume(value)} MON`, 'Volume']}
                    labelFormatter={(label) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="weightedVolume"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#volumeGradient)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={formatVolume}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${formatVolume(value)} MON`, 'Volume']}
                  />
                  <Bar
                    dataKey="weightedVolume"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No volume data for this period</p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Showing weighted volume • Updates every minute
        </p>
      </CardContent>
    </Card>
  );
}
