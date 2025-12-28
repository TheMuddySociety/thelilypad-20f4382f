import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface NFTSalesAnalyticsProps {
  collectionId?: string;
  nftId?: string;
  showTitle?: boolean;
}

interface SaleData {
  id: string;
  price: number;
  currency: string;
  sold_at: string;
  seller_address: string;
  buyer_address: string;
}

interface PricePoint {
  date: string;
  price: number;
  volume: number;
  sales: number;
}

interface AnalyticsStats {
  totalVolume: number;
  totalSales: number;
  averagePrice: number;
  floorPrice: number;
  highestSale: number;
  priceChange24h: number;
  volumeChange24h: number;
}

export function NFTSalesAnalytics({ collectionId, nftId, showTitle = true }: NFTSalesAnalyticsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState<SaleData[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [stats, setStats] = useState<AnalyticsStats>({
    totalVolume: 0,
    totalSales: 0,
    averagePrice: 0,
    floorPrice: 0,
    highestSale: 0,
    priceChange24h: 0,
    volumeChange24h: 0
  });
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    fetchAnalytics();
  }, [collectionId, nftId, timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Build query for sold listings
      let query = supabase
        .from("nft_listings")
        .select(`
          id,
          price,
          currency,
          sold_at,
          seller_address,
          buyer_address,
          nft:minted_nfts(
            id,
            collection_id
          )
        `)
        .eq("status", "sold")
        .not("sold_at", "is", null)
        .order("sold_at", { ascending: false });

      // Filter by date range
      if (timeRange === "7d") {
        query = query.gte("sold_at", subDays(new Date(), 7).toISOString());
      } else if (timeRange === "30d") {
        query = query.gte("sold_at", subDays(new Date(), 30).toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching sales:", error);
        return;
      }

      // Filter by collection or NFT if specified
      let filteredData = data || [];
      if (collectionId) {
        filteredData = filteredData.filter(
          (sale) => sale.nft && (sale.nft as any).collection_id === collectionId
        );
      }
      if (nftId) {
        filteredData = filteredData.filter(
          (sale) => sale.nft && (sale.nft as any).id === nftId
        );
      }

      const sales: SaleData[] = filteredData.map((sale) => ({
        id: sale.id,
        price: Number(sale.price),
        currency: sale.currency,
        sold_at: sale.sold_at!,
        seller_address: sale.seller_address,
        buyer_address: sale.buyer_address || ""
      }));

      setSalesData(sales);

      // Calculate stats
      if (sales.length > 0) {
        const totalVolume = sales.reduce((sum, sale) => sum + sale.price, 0);
        const averagePrice = totalVolume / sales.length;
        const prices = sales.map((s) => s.price);
        const floorPrice = Math.min(...prices);
        const highestSale = Math.max(...prices);

        // Calculate 24h changes
        const now = new Date();
        const yesterday = subDays(now, 1);
        const twoDaysAgo = subDays(now, 2);

        const last24hSales = sales.filter(
          (s) => new Date(s.sold_at) >= yesterday
        );
        const prev24hSales = sales.filter(
          (s) => new Date(s.sold_at) >= twoDaysAgo && new Date(s.sold_at) < yesterday
        );

        const last24hVolume = last24hSales.reduce((sum, s) => sum + s.price, 0);
        const prev24hVolume = prev24hSales.reduce((sum, s) => sum + s.price, 0);
        const last24hAvg = last24hSales.length > 0 ? last24hVolume / last24hSales.length : 0;
        const prev24hAvg = prev24hSales.length > 0 ? prev24hVolume / prev24hSales.length : 0;

        const priceChange24h = prev24hAvg > 0 ? ((last24hAvg - prev24hAvg) / prev24hAvg) * 100 : 0;
        const volumeChange24h = prev24hVolume > 0 ? ((last24hVolume - prev24hVolume) / prev24hVolume) * 100 : 0;

        setStats({
          totalVolume,
          totalSales: sales.length,
          averagePrice,
          floorPrice,
          highestSale,
          priceChange24h,
          volumeChange24h
        });
      } else {
        setStats({
          totalVolume: 0,
          totalSales: 0,
          averagePrice: 0,
          floorPrice: 0,
          highestSale: 0,
          priceChange24h: 0,
          volumeChange24h: 0
        });
      }

      // Build price history for chart
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const dateRange = eachDayOfInterval({
        start: subDays(new Date(), days),
        end: new Date()
      });

      const history: PricePoint[] = dateRange.map((date) => {
        const dayStart = startOfDay(date);
        const nextDay = startOfDay(subDays(date, -1));
        
        const daySales = sales.filter((s) => {
          const saleDate = new Date(s.sold_at);
          return saleDate >= dayStart && saleDate < nextDay;
        });

        const dayVolume = daySales.reduce((sum, s) => sum + s.price, 0);
        const avgPrice = daySales.length > 0 ? dayVolume / daySales.length : null;

        return {
          date: format(date, "MMM dd"),
          price: avgPrice || 0,
          volume: dayVolume,
          sales: daySales.length
        };
      });

      setPriceHistory(history);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `${(price / 1000).toFixed(1)}K`;
    }
    return price.toFixed(2);
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon,
    suffix = "MON"
  }: { 
    title: string; 
    value: number; 
    change?: number;
    icon: React.ElementType;
    suffix?: string;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          {change !== undefined && change !== 0 && (
            <Badge 
              variant="outline" 
              className={change > 0 ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}
            >
              {change > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {Math.abs(change).toFixed(1)}%
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">
            {formatPrice(value)} {suffix !== "count" && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
          </p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showTitle && <Skeleton className="h-8 w-48" />}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Sales Analytics</h2>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Volume" 
          value={stats.totalVolume} 
          change={stats.volumeChange24h}
          icon={DollarSign}
        />
        <StatCard 
          title="Total Sales" 
          value={stats.totalSales}
          icon={Activity}
          suffix="count"
        />
        <StatCard 
          title="Average Price" 
          value={stats.averagePrice}
          change={stats.priceChange24h}
          icon={TrendingUp}
        />
        <StatCard 
          title="Highest Sale" 
          value={stats.highestSale}
          icon={TrendingDown}
        />
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Price History</CardTitle>
              <CardDescription>Average sale price over time</CardDescription>
            </div>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <TabsList className="h-8">
                <TabsTrigger value="7d" className="text-xs px-2">7D</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs px-2">30D</TabsTrigger>
                <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="price" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="price" className="gap-1">
                <TrendingUp className="w-4 h-4" />
                Price
              </TabsTrigger>
              <TabsTrigger value="volume" className="gap-1">
                <BarChart3 className="w-4 h-4" />
                Volume
              </TabsTrigger>
              <TabsTrigger value="sales" className="gap-1">
                <Activity className="w-4 h-4" />
                Sales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="price">
              {priceHistory.some(p => p.price > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={priceHistory}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      tickFormatter={(value) => `${value} MON`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`${value.toFixed(2)} MON`, "Avg Price"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#priceGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No price data available</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="volume">
              {priceHistory.some(p => p.volume > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      tickFormatter={(value) => `${value} MON`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`${value.toFixed(2)} MON`, "Volume"]}
                    />
                    <Bar 
                      dataKey="volume" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No volume data available</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sales">
              {priceHistory.some(p => p.sales > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [value, "Sales"]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No sales data available</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      {salesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Sales
            </CardTitle>
            <CardDescription>Latest marketplace transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salesData.slice(0, 5).map((sale) => (
                <div 
                  key={sale.id} 
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {sale.price.toFixed(2)} {sale.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.seller_address.slice(0, 6)}...{sale.seller_address.slice(-4)} → {sale.buyer_address.slice(0, 6)}...{sale.buyer_address.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(sale.sold_at), "MMM dd, HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {salesData.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">No sales data available yet</p>
            <p className="text-sm text-muted-foreground mt-1">Sales will appear here once NFTs are traded</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
