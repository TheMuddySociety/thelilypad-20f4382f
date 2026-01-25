import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Gift,
  Image as ImageIcon,
  Sparkles,
  CheckCircle,
  Calendar
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface WithdrawalRecord {
  id: string;
  type: "donation" | "nft_sale" | "shop_sale";
  amount: number;
  claimedAt: string;
  details?: string;
}

export const WithdrawalHistory: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    fetchWithdrawalHistory();
  }, [userId]);

  const fetchWithdrawalHistory = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const allWithdrawals: WithdrawalRecord[] = [];

      // Fetch claimed donations
      const { data: donationsData } = await supabase
        .from("earnings")
        .select("id, amount, claimed_at, from_username, type")
        .eq("user_id", userId)
        .eq("is_claimed", true)
        .not("claimed_at", "is", null)
        .order("claimed_at", { ascending: false })
        .limit(50);

      if (donationsData) {
        donationsData.forEach((d) => {
          allWithdrawals.push({
            id: `donation-${d.id}`,
            type: "donation",
            amount: Number(d.amount),
            claimedAt: d.claimed_at!,
            details: d.from_username ? `From ${d.from_username}` : d.type,
          });
        });
      }

      // Fetch claimed NFT sales
      const { data: nftSalesData } = await supabase
        .from("nft_listings")
        .select("id, price, seller_claimed_at, nft_id")
        .eq("seller_id", userId)
        .eq("seller_claimed", true)
        .not("seller_claimed_at", "is", null)
        .order("seller_claimed_at", { ascending: false })
        .limit(50);

      if (nftSalesData) {
        nftSalesData.forEach((s) => {
          allWithdrawals.push({
            id: `nft-${s.id}`,
            type: "nft_sale",
            amount: Number(s.price),
            claimedAt: s.seller_claimed_at!,
            details: "NFT Sale",
          });
        });
      }

      // Fetch claimed shop sales
      const { data: shopItemsData } = await supabase
        .from("shop_items")
        .select("id, name")
        .eq("creator_id", userId);

      if (shopItemsData && shopItemsData.length > 0) {
        const shopItemIds = shopItemsData.map((item) => item.id);
        const shopItemNames = shopItemsData.reduce((acc, item) => {
          acc[item.id] = item.name;
          return acc;
        }, {} as Record<string, string>);

        const { data: purchasesData } = await supabase
          .from("shop_purchases")
          .select("id, price_paid, creator_claimed_at, item_id")
          .in("item_id", shopItemIds)
          .eq("creator_claimed", true)
          .not("creator_claimed_at", "is", null)
          .order("creator_claimed_at", { ascending: false })
          .limit(50);

        if (purchasesData) {
          purchasesData.forEach((p) => {
            allWithdrawals.push({
              id: `shop-${p.id}`,
              type: "shop_sale",
              amount: Number(p.price_paid),
              claimedAt: p.creator_claimed_at!,
              details: shopItemNames[p.item_id] || "Shop Item",
            });
          });
        }
      }

      // Sort by claimed date
      allWithdrawals.sort(
        (a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime()
      );

      setWithdrawals(allWithdrawals);
    } catch (error) {
      console.error("Error fetching withdrawal history:", error);
    }
    setIsLoading(false);
  };

  const getTypeConfig = (type: WithdrawalRecord["type"]) => {
    switch (type) {
      case "donation":
        return {
          icon: Gift,
          label: "Donation",
          color: "text-pink-500",
          bgColor: "bg-pink-500/10",
        };
      case "nft_sale":
        return {
          icon: ImageIcon,
          label: "NFT Sale",
          color: "text-purple-500",
          bgColor: "bg-purple-500/10",
        };
      case "shop_sale":
        return {
          icon: Sparkles,
          label: "Shop Sale",
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
        };
    }
  };

  // Group withdrawals by date
  const groupedByDate = withdrawals.reduce((acc, w) => {
    const dateKey = format(new Date(w.claimedAt), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = { date: new Date(w.claimedAt), items: [], total: 0 };
    }
    acc[dateKey].items.push(w);
    acc[dateKey].total += w.amount;
    return acc;
  }, {} as Record<string, { date: Date; items: WithdrawalRecord[]; total: number }>);

  const totalClaimed = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Withdrawal History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Withdrawal History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Please sign in to view withdrawal history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Withdrawal History
          {totalClaimed > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {totalClaimed.toFixed(4)} SOL Total
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No withdrawals yet</p>
            <p className="text-xs mt-1">Your claimed funds will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([dateKey, group]) => (
                <div key={dateKey} className="space-y-2">
                  {/* Date Header */}
                  <div className="flex items-center justify-between sticky top-0 bg-card py-2 z-10">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">
                        {format(group.date, "MMMM d, yyyy")}
                      </span>
                      <span className="text-xs">
                        ({formatDistanceToNow(group.date, { addSuffix: true })})
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {group.total.toFixed(4)} SOL
                    </Badge>
                  </div>

                  {/* Withdrawal Items */}
                  <div className="space-y-2">
                    {group.items.map((withdrawal) => {
                      const config = getTypeConfig(withdrawal.type);
                      const Icon = config.icon;

                      return (
                        <div
                          key={withdrawal.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {config.label}
                              </span>
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            </div>
                            {withdrawal.details && (
                              <p className="text-xs text-muted-foreground truncate">
                                {withdrawal.details}
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className={`text-sm font-bold ${config.color}`}>
                              +{withdrawal.amount.toFixed(4)} SOL
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(withdrawal.claimedAt), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default WithdrawalHistory;
