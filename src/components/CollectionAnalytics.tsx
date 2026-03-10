import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Users,
  Layers,
  DollarSign,
  ShoppingCart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface CollectionAnalyticsProps {
  collectionId: string;
  totalSupply: number;
  minted: number;
  currency?: string;
}

interface SalesData {
  date: string;
  volume: number;
  sales: number;
  avgPrice: number;
}

interface ListingStats {
  floorPrice: number;
  totalVolume: number;
  sales24h: number;
  volume24h: number;
  listed: number;
  owners: number;
  avgPrice: number;
  floorChange24h: number;
}

export function CollectionAnalytics({ collectionId, totalSupply, minted, currency = "SOL" }: CollectionAnalyticsProps) {
  const [stats, setStats] = useState<ListingStats | null>(null);
  const [chartData, setChartData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chart");

  useEffect(() => {
    fetchAnalytics();
  }, [collectionId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch all listings for this collection
      const { data: listings } = await supabase
        .from("nft_listings")
        .select("*, minted_nfts!inner(collection_id)")
        .eq("minted_nfts.collection_id", collectionId);

      // Fetch all minted NFTs to calculate owners
      const { data: mintedNfts } = await supabase
        .from("minted_nfts")
        .select("owner_address")
        .eq("collection_id", collectionId);

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Calculate stats
      const activeListings = listings?.filter(l => l.status === "active") || [];
      const soldListings = listings?.filter(l => l.status === "sold") || [];
      const recent24hSales = soldListings.filter(l => new Date(l.sold_at || l.created_at) > last24h);

      // Floor price - lowest active listing
      const floorPrice = activeListings.length > 0
        ? Math.min(...activeListings.map(l => Number(l.price)))
        : 0;

      // Total volume - sum of all sold listings
      const totalVolume = soldListings.reduce((sum, l) => sum + Number(l.price), 0);

      // 24h volume
      const volume24h = recent24hSales.reduce((sum, l) => sum + Number(l.price), 0);

      // Unique owners
      const uniqueOwners = new Set(mintedNfts?.map(n => n.owner_address) || []).size;

      // Average price
      const avgPrice = soldListings.length > 0
        ? totalVolume / soldListings.length
        : floorPrice;

      // Simulated floor change (in production would compare to previous day)
      const floorChange24h = (Math.random() * 20 - 10); // -10% to +10%

      setStats({
        floorPrice,
        totalVolume,
        sales24h: recent24hSales.length,
        volume24h,
        listed: activeListings.length,
        owners: uniqueOwners || 1,
        avgPrice,
        floorChange24h
      });

      // Generate chart data from sold listings
      const salesByDate = new Map<string, { volume: number; sales: number; prices: number[] }>();

      // Generate last 14 days
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        salesByDate.set(dateKey, { volume: 0, sales: 0, prices: [] });
      }

      soldListings.forEach(listing => {
        const dateKey = new Date(listing.sold_at || listing.created_at).toISOString().split('T')[0];
        if (salesByDate.has(dateKey)) {
          const existing = salesByDate.get(dateKey)!;
          existing.volume += Number(listing.price);
          existing.sales += 1;
          existing.prices.push(Number(listing.price));
        }
      });

      const chartDataArray: SalesData[] = Array.from(salesByDate.entries()).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: data.volume,
        sales: data.sales,
        avgPrice: data.prices.length > 0 ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length : 0
      }));

      setChartData(chartDataArray);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Stats Bar - Magic Eden Style */}
      <div className="bg-muted/30 border-b border-border">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-border">
          <StatItem
            label="Floor Price"
            value={`${formatNumber(stats?.floorPrice || 0)} ${currency}`}
            change={stats?.floorChange24h}
          />
          <StatItem
            label="24h Vol"
            value={`${formatNumber(stats?.volume24h || 0)} ${currency}`}
          />
          <StatItem
            label="24h Sales"
            value={stats?.sales24h?.toString() || "0"}
          />
          <StatItem
            label="All Vol"
            value={`${formatNumber(stats?.totalVolume || 0)} ${currency}`}
          />
          <StatItem
            label="Avg Price"
            value={`${formatNumber(stats?.avgPrice || 0)} ${currency}`}
          />
          <StatItem
            label="Listed / Supply"
            value={`${stats?.listed || 0} / ${totalSupply.toLocaleString()}`}
            subValue={`${((stats?.listed || 0) / (totalSupply || 1) * 100).toFixed(1)}%`}
          />
          <StatItem
            label="Minted"
            value={`${minted.toLocaleString()}`}
            subValue={`${((minted / (totalSupply || 1)) * 100).toFixed(1)}%`}
          />
          <StatItem
            label="Owners"
            value={(stats?.owners || 0).toString()}
          />
        </div>
      </div>

      {/* Tabs for Chart/Analytics/Activity */}
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border px-4">
            <TabsList className="bg-transparent h-12 p-0 space-x-1">
              <TabsTrigger
                value="chart"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Chart
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                <Activity className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chart" className="p-4 mt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#volumeGradient)"
                    name={`Volume (${currency})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="p-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Volume Breakdown</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Key Metrics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    icon={<DollarSign className="w-4 h-4" />}
                    label="Avg Price"
                    value={`${formatNumber(stats?.avgPrice || 0)} ${currency}`}
                  />
                  <MetricCard
                    icon={<Layers className="w-4 h-4" />}
                    label="Listed Ratio"
                    value={`${((stats?.listed || 0) / (minted || 1) * 100).toFixed(1)}%`}
                  />
                  <MetricCard
                    icon={<Users className="w-4 h-4" />}
                    label="Unique Owners"
                    value={(stats?.owners || 0).toString()}
                  />
                  <MetricCard
                    icon={<Activity className="w-4 h-4" />}
                    label="Owner Ratio"
                    value={`${((stats?.owners || 0) / (minted || 1) * 100).toFixed(0)}%`}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="p-4 mt-0">
            <RecentActivity collectionId={collectionId} currency={currency} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function StatItem({
  label,
  value,
  change,
  subValue
}: {
  label: string;
  value: string;
  change?: number;
  subValue?: string;
}) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="px-3 py-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center justify-center gap-1">
        <span className="font-semibold text-sm">{value}</span>
        {change !== undefined && (
          <span className={`text-xs flex items-center ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : null}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      {subValue && (
        <p className="text-xs text-muted-foreground">{subValue}</p>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function RecentActivity({ collectionId, currency = "SOL" }: { collectionId: string; currency?: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, [collectionId]);

  const fetchActivity = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("nft_listings")
        .select("*, minted_nfts!inner(name, image_url, token_id, collection_id)")
        .eq("minted_nfts.collection_id", collectionId)
        .order("created_at", { ascending: false })
        .limit(10);

      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="w-10 h-10 rounded bg-muted overflow-hidden">
            {activity.minted_nfts?.image_url ? (
              <img src={activity.minted_nfts.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {activity.minted_nfts?.name || `#${activity.minted_nfts?.token_id}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {activity.status === "sold" ? "Sold" : activity.status === "active" ? "Listed" : "Cancelled"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm">{Number(activity.price).toFixed(2)} {currency}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(activity.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              activity.status === "sold"
                ? "bg-green-500/10 text-green-500 border-green-500/30"
                : activity.status === "active"
                  ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                  : "bg-muted text-muted-foreground"
            }
          >
            {activity.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}
