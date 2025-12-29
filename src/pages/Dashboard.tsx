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
import { useSEO } from "@/hooks/useSEO";
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
  Radio,
  Palette,
  Rocket,
  FileEdit,
  Trash2,
  Sticker,
  Plus
} from "lucide-react";
import { ShopItemsList } from "@/components/shop/ShopItemsList";
import { ClaimFunds } from "@/components/ClaimFunds";
import { CreateShopItemModal } from "@/components/shop/CreateShopItemModal";
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

interface DraftCollection {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  image_url: string | null;
  total_supply: number;
  status: string;
  created_at: string;
  updated_at: string;
}

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
  const [draftCollections, setDraftCollections] = useState<DraftCollection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [showCreateShopItem, setShowCreateShopItem] = useState(false);
  const [shopItemRefreshTrigger, setShopItemRefreshTrigger] = useState(0);

  useSEO({
    title: "Creator Dashboard | The Lily Pad",
    description: "Track your stream performance, manage NFT collections, view earnings and analytics. Your complete creator dashboard on The Lily Pad."
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
      fetchDraftCollections();
    }
  }, [user]);

  const fetchDraftCollections = async () => {
    setIsLoadingCollections(true);
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("creator_id", user.id)
        .in("status", ["draft", "upcoming"])
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching collections:", error);
      } else {
        setDraftCollections(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const handleDeleteDraft = async (collectionId: string) => {
    try {
      const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", collectionId)
        .eq("creator_id", user.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete collection",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deleted",
          description: "Collection draft removed",
        });
        fetchDraftCollections();
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

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
            <Button variant="outline" onClick={() => navigate("/launchpad")} className="w-full sm:w-auto">
              <Palette className="w-4 h-4 mr-2" />
              NFT Launchpad
            </Button>
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

        {/* Shop Items Section */}
        <Card className="glass-card border-border/50 mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Sticker className="w-5 h-5" />
                  Your Shop Items
                </CardTitle>
                <CardDescription>Sticker and emoji packs you're selling</CardDescription>
              </div>
              <Button onClick={() => setShowCreateShopItem(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Pack
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <ShopItemsList
              userId={user.id}
              onEdit={(id) => console.log("Edit item:", id)}
              onCreateNew={() => setShowCreateShopItem(true)}
              refreshTrigger={shopItemRefreshTrigger}
            />
          </CardContent>
        </Card>

        {/* NFT Collection Drafts Section */}
        <Card className="glass-card border-border/50 mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Your NFT Collections
                </CardTitle>
                <CardDescription>Draft and upcoming collections you've created</CardDescription>
              </div>
              <Button onClick={() => navigate("/launchpad")} size="sm">
                <Rocket className="w-4 h-4 mr-2" />
                Create New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {isLoadingCollections ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : draftCollections.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {draftCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {collection.image_url ? (
                        <img 
                          src={collection.image_url} 
                          alt={collection.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Palette className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base truncate">{collection.name}</h3>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            collection.status === "draft" 
                              ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                              : collection.status === "upcoming"
                              ? "bg-blue-500/20 text-blue-500 border-blue-500/30"
                              : "bg-green-500/20 text-green-500 border-green-500/30"
                          }`}
                        >
                          {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
                        </Badge>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{collection.symbol}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{collection.total_supply.toLocaleString()} supply</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/launchpad/${collection.id}`)}
                      >
                        <FileEdit className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      {collection.status === "draft" && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteDraft(collection.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No NFT collections yet</p>
                <Button variant="link" onClick={() => navigate("/launchpad")}>
                  Create your first collection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Shop Item Modal */}
        <CreateShopItemModal
          open={showCreateShopItem}
          onOpenChange={setShowCreateShopItem}
          userId={user.id}
          onSuccess={() => setShopItemRefreshTrigger((t) => t + 1)}
        />

        {/* Claim Funds */}
        <ClaimFunds />

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
