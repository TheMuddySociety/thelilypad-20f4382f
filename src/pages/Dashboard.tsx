import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Eye, 
  TrendingUp,
  Clock,
  Video,
  Heart,
  ArrowUpRight,
  Shield,
  ArrowDownRight,
  Calendar,
  Radio
} from "lucide-react";
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

// Mock data for charts - in production this would come from the database
const viewerData = [
  { date: "Mon", viewers: 120 },
  { date: "Tue", viewers: 180 },
  { date: "Wed", viewers: 250 },
  { date: "Thu", viewers: 310 },
  { date: "Fri", viewers: 420 },
  { date: "Sat", viewers: 580 },
  { date: "Sun", viewers: 490 },
];

const earningsData = [
  { date: "Jan", amount: 120 },
  { date: "Feb", amount: 180 },
  { date: "Mar", amount: 250 },
  { date: "Apr", amount: 310 },
  { date: "May", amount: 420 },
  { date: "Jun", amount: 380 },
];

const recentStreams = [
  { id: 1, title: "Late Night Gaming Session", category: "Gaming", viewers: 342, duration: "3h 24m", date: "2 hours ago" },
  { id: 2, title: "Art & Chill Stream", category: "Art", viewers: 189, duration: "2h 45m", date: "Yesterday" },
  { id: 3, title: "Just Chatting with Community", category: "Just Chatting", viewers: 567, duration: "4h 12m", date: "2 days ago" },
];

const recentDonations = [
  { id: 1, from: "CryptoFrog", amount: 25.00, message: "Love the content!", date: "1 hour ago" },
  { id: 2, from: "MonadMaxi", amount: 50.00, message: "Keep up the great streams!", date: "3 hours ago" },
  { id: 3, from: "LilyPadFan", amount: 10.00, message: "🐸", date: "Yesterday" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalFollowers: 0,
    totalEarnings: 0,
    totalStreams: 0,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch streams count
      const { count: streamsCount } = await supabase
        .from("streams")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Fetch followers count
      const { count: followersCount } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("streamer_id", user.id);

      // Fetch total earnings
      const { data: earningsData } = await supabase
        .from("earnings")
        .select("amount")
        .eq("user_id", user.id);

      const totalEarnings = earningsData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Fetch total views from streams
      const { data: streamsData } = await supabase
        .from("streams")
        .select("total_views")
        .eq("user_id", user.id);

      const totalViews = streamsData?.reduce((sum, s) => sum + (s.total_views || 0), 0) || 0;

      setStats({
        totalViews,
        totalFollowers: followersCount || 0,
        totalEarnings,
        totalStreams: streamsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }

    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-8 sm:pb-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Creator Dashboard</h1>
            <p className="text-muted-foreground">Track your stream performance and earnings</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => navigate("/moderation")} className="w-full sm:w-auto">
              <Shield className="w-4 h-4 mr-2" />
              Moderation
            </Button>
            <Button onClick={() => navigate("/go-live")} className="w-full sm:w-auto">
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="glass-card border-border/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  12%
                </Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl sm:text-3xl font-bold">{formatNumber(stats.totalViews)}</div>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">Total Views</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  8%
                </Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl sm:text-3xl font-bold">{formatNumber(stats.totalFollowers)}</div>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">Followers</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  24%
                </Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl sm:text-3xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">Total Earnings</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <Video className="w-5 h-5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  5%
                </Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl sm:text-3xl font-bold">{stats.totalStreams}</div>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">Total Streams</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="glass-card border-border/50">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Viewer Analytics
              </CardTitle>
              <CardDescription>Daily average concurrent viewers</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="h-[200px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={viewerData}>
                    <defs>
                      <linearGradient id="viewerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="viewers" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#viewerGradient)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Earnings Overview
              </CardTitle>
              <CardDescription>Monthly earnings breakdown</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="h-[200px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value) => [`$${value}`, "Earnings"]}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Tabs defaultValue="streams" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
            <TabsTrigger value="streams" className="text-xs sm:text-sm">
              <Video className="w-4 h-4 mr-1 sm:mr-2" />
              Recent Streams
            </TabsTrigger>
            <TabsTrigger value="donations" className="text-xs sm:text-sm">
              <Heart className="w-4 h-4 mr-1 sm:mr-2" />
              Recent Donations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="streams">
            <Card className="glass-card border-border/50">
              <CardContent className="p-4 sm:p-6">
                {recentStreams.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {recentStreams.map((stream) => (
                      <div
                        key={stream.id}
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                          <Video className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm sm:text-base truncate">{stream.title}</h3>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">{stream.category}</Badge>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{stream.date}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Eye className="w-3.5 h-3.5" />
                            {stream.viewers}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {stream.duration}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No streams yet</p>
                    <Button variant="link" onClick={() => navigate("/go-live")}>
                      Start your first stream
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donations">
            <Card className="glass-card border-border/50">
              <CardContent className="p-4 sm:p-6">
                {recentDonations.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {recentDonations.map((donation) => (
                      <div
                        key={donation.id}
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                          <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm sm:text-base">{donation.from}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {donation.message}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm sm:text-base font-bold text-primary">
                            {formatCurrency(donation.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">{donation.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No donations yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
