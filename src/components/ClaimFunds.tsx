import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, 
  DollarSign, 
  Image as ImageIcon, 
  Gift, 
  Sparkles,
  ArrowRight,
  CheckCircle,
  Loader2,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/providers/WalletProvider";

interface ClaimableEarnings {
  donations: {
    amount: number;
    count: number;
    ids: string[];
  };
  nftSales: {
    amount: number;
    count: number;
    ids: string[];
  };
  shopSales: {
    amount: number;
    count: number;
    purchaseIds: string[];
  };
}

export const ClaimFunds: React.FC = () => {
  const { address, isConnected } = useWallet();
  const [earnings, setEarnings] = useState<ClaimableEarnings>({
    donations: { amount: 0, count: 0, ids: [] },
    nftSales: { amount: 0, count: 0, ids: [] },
    shopSales: { amount: 0, count: 0, purchaseIds: [] },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [claimingType, setClaimingType] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    fetchEarnings();
  }, [userId]);

  const fetchEarnings = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch unclaimed donations
      const { data: donationsData, error: donationsError } = await supabase
        .from("earnings")
        .select("id, amount")
        .eq("user_id", userId)
        .eq("is_claimed", false);

      if (donationsError) throw donationsError;

      const donationTotal = (donationsData || []).reduce((sum, d) => sum + Number(d.amount), 0);
      const donationIds = (donationsData || []).map(d => d.id);

      // Fetch unclaimed NFT sales
      const { data: nftSalesData, error: nftSalesError } = await supabase
        .from("nft_listings")
        .select("id, price")
        .eq("seller_id", userId)
        .eq("status", "sold")
        .eq("seller_claimed", false);

      if (nftSalesError) throw nftSalesError;

      const nftSalesTotal = (nftSalesData || []).reduce((sum, s) => sum + Number(s.price), 0);
      const nftSalesIds = (nftSalesData || []).map(s => s.id);

      // Fetch unclaimed shop sales (stickers, emotes)
      const { data: shopItemsData, error: shopItemsError } = await supabase
        .from("shop_items")
        .select("id")
        .eq("creator_id", userId);

      if (shopItemsError) throw shopItemsError;

      const shopItemIds = (shopItemsData || []).map(item => item.id);
      
      let shopSalesTotal = 0;
      let shopSalesCount = 0;
      let shopPurchaseIds: string[] = [];

      if (shopItemIds.length > 0) {
        const { data: purchasesData, error: purchasesError } = await supabase
          .from("shop_purchases")
          .select("id, price_paid, item_id")
          .in("item_id", shopItemIds)
          .eq("creator_claimed", false);

        if (purchasesError) throw purchasesError;

        shopSalesTotal = (purchasesData || []).reduce((sum, p) => sum + Number(p.price_paid), 0);
        shopSalesCount = (purchasesData || []).length;
        shopPurchaseIds = (purchasesData || []).map(p => p.id);
      }

      setEarnings({
        donations: { amount: donationTotal, count: donationsData?.length || 0, ids: donationIds },
        nftSales: { amount: nftSalesTotal, count: nftSalesData?.length || 0, ids: nftSalesIds },
        shopSales: { amount: shopSalesTotal, count: shopSalesCount, purchaseIds: shopPurchaseIds },
      });
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast.error("Failed to fetch earnings");
    }
    setIsLoading(false);
  };

  const handleClaim = async (type: "donations" | "nftSales" | "shopSales") => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet to claim funds");
      return;
    }

    setClaimingType(type);

    try {
      if (type === "donations" && earnings.donations.ids.length > 0) {
        const { error } = await supabase
          .from("earnings")
          .update({ is_claimed: true, claimed_at: new Date().toISOString() })
          .in("id", earnings.donations.ids);
        
        if (error) throw error;
        toast.success(`Claimed ${earnings.donations.amount.toFixed(4)} MON from donations!`);
      } 
      else if (type === "nftSales" && earnings.nftSales.ids.length > 0) {
        const { error } = await supabase
          .from("nft_listings")
          .update({ seller_claimed: true, seller_claimed_at: new Date().toISOString() })
          .in("id", earnings.nftSales.ids);
        
        if (error) throw error;
        toast.success(`Claimed ${earnings.nftSales.amount.toFixed(4)} MON from NFT sales!`);
      }
      else if (type === "shopSales" && earnings.shopSales.purchaseIds.length > 0) {
        const { error } = await supabase
          .from("shop_purchases")
          .update({ creator_claimed: true, creator_claimed_at: new Date().toISOString() })
          .in("id", earnings.shopSales.purchaseIds);
        
        if (error) throw error;
        toast.success(`Claimed ${earnings.shopSales.amount.toFixed(4)} MON from shop sales!`);
      }

      // Refresh earnings
      await fetchEarnings();
    } catch (error) {
      console.error("Error claiming funds:", error);
      toast.error("Failed to claim funds. Please try again.");
    }

    setClaimingType(null);
  };

  const handleClaimAll = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet to claim funds");
      return;
    }

    setClaimingType("all");

    try {
      const promises = [];

      if (earnings.donations.ids.length > 0) {
        promises.push(
          supabase
            .from("earnings")
            .update({ is_claimed: true, claimed_at: new Date().toISOString() })
            .in("id", earnings.donations.ids)
        );
      }

      if (earnings.nftSales.ids.length > 0) {
        promises.push(
          supabase
            .from("nft_listings")
            .update({ seller_claimed: true, seller_claimed_at: new Date().toISOString() })
            .in("id", earnings.nftSales.ids)
        );
      }

      if (earnings.shopSales.purchaseIds.length > 0) {
        promises.push(
          supabase
            .from("shop_purchases")
            .update({ creator_claimed: true, creator_claimed_at: new Date().toISOString() })
            .in("id", earnings.shopSales.purchaseIds)
        );
      }

      await Promise.all(promises);
      toast.success(`Successfully claimed ${totalClaimable.toFixed(4)} MON!`);
      await fetchEarnings();
    } catch (error) {
      console.error("Error claiming all funds:", error);
      toast.error("Failed to claim funds. Please try again.");
    }

    setClaimingType(null);
  };

  const totalClaimable = earnings.donations.amount + earnings.nftSales.amount + earnings.shopSales.amount;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Claim Funds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Claim Funds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Please sign in to view your claimable funds</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const earningCategories = [
    {
      id: "donations" as const,
      label: "Stream Donations",
      icon: Gift,
      amount: earnings.donations.amount,
      count: earnings.donations.count,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/30",
    },
    {
      id: "nftSales" as const,
      label: "NFT Sales",
      icon: ImageIcon,
      amount: earnings.nftSales.amount,
      count: earnings.nftSales.count,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
    },
    {
      id: "shopSales" as const,
      label: "Stickers & Emotes",
      icon: Sparkles,
      amount: earnings.shopSales.amount,
      count: earnings.shopSales.count,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Claim Funds
          {totalClaimable > 0 && (
            <Badge className="ml-auto bg-green-500/20 text-green-500 border-green-500/30">
              <TrendingUp className="w-3 h-3 mr-1" />
              Funds Available
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Claimable */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-purple-500/10 border border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Claimable</p>
              <p className="text-3xl font-bold text-primary">
                {totalClaimable.toFixed(4)} <span className="text-lg">MON</span>
              </p>
            </div>
            {totalClaimable > 0 && (
              <Button
                onClick={handleClaimAll}
                disabled={claimingType !== null || !isConnected}
                className="bg-primary hover:bg-primary/90"
              >
                {claimingType === "all" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Claim All
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Individual Categories */}
        <div className="space-y-3">
          {earningCategories.map((category) => {
            const Icon = category.icon;
            const hasClaimable = category.amount > 0;

            return (
              <div
                key={category.id}
                className={`p-4 rounded-lg border ${category.bgColor} ${category.borderColor} transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${category.bgColor}`}>
                      <Icon className={`w-5 h-5 ${category.color}`} />
                    </div>
                    <div>
                      <p className="font-medium">{category.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.count} {category.count === 1 ? "transaction" : "transactions"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold ${hasClaimable ? category.color : "text-muted-foreground"}`}>
                        {category.amount.toFixed(4)} MON
                      </p>
                    </div>
                    {hasClaimable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClaim(category.id)}
                        disabled={claimingType !== null}
                        className={`border-2 ${category.borderColor} hover:${category.bgColor}`}
                      >
                        {claimingType === category.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            Claim
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalClaimable === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No unclaimed funds at the moment</p>
            <p className="text-xs mt-1">Earnings from sales and donations will appear here</p>
          </div>
        )}

        {!isConnected && totalClaimable > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
            <p className="text-sm text-amber-500">
              Connect your wallet to claim your funds
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaimFunds;
