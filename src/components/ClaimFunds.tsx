import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  DollarSign, 
  Image as ImageIcon, 
  Gift, 
  Sparkles,
  ArrowRight,
  CheckCircle,
  Loader2,
  TrendingUp,
  Settings,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/providers/WalletProvider";
import { useCreatorCurrency, CurrencyType } from "@/hooks/useCreatorCurrency";

interface CurrencyEarnings {
  amount: number;
  count: number;
  ids: string[];
}

interface ClaimableEarnings {
  donations: { mon: CurrencyEarnings; sol: CurrencyEarnings };
  nftSales: { mon: CurrencyEarnings; sol: CurrencyEarnings };
  shopSales: { mon: CurrencyEarnings; sol: CurrencyEarnings };
}

const emptyEarnings: CurrencyEarnings = { amount: 0, count: 0, ids: [] };

export const ClaimFunds: React.FC = () => {
  const { address, isConnected, chainType } = useWallet();
  const [earnings, setEarnings] = useState<ClaimableEarnings>({
    donations: { mon: { ...emptyEarnings }, sol: { ...emptyEarnings } },
    nftSales: { mon: { ...emptyEarnings }, sol: { ...emptyEarnings } },
    shopSales: { mon: { ...emptyEarnings }, sol: { ...emptyEarnings } },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [claimingType, setClaimingType] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCurrency] = useState<CurrencyType>("SOL");
  
  const { 
    payoutWalletAddress, 
    solWalletAddress, 
    preferredCurrency 
  } = useCreatorCurrency(userId || undefined);

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
      // Fetch unclaimed donations (grouped by currency)
      const { data: donationsData, error: donationsError } = await supabase
        .from("earnings")
        .select("id, amount, currency")
        .eq("user_id", userId)
        .eq("is_claimed", false);

      if (donationsError) throw donationsError;

      const donationsMon = (donationsData || []).filter(d => d.currency !== "SOL");
      const donationsSol = (donationsData || []).filter(d => d.currency === "SOL");

      // Fetch unclaimed NFT sales
      const { data: nftSalesData, error: nftSalesError } = await supabase
        .from("nft_listings")
        .select("id, price, currency")
        .eq("seller_id", userId)
        .eq("status", "sold")
        .eq("seller_claimed", false);

      if (nftSalesError) throw nftSalesError;

      const nftSalesMon = (nftSalesData || []).filter(s => s.currency !== "SOL");
      const nftSalesSol = (nftSalesData || []).filter(s => s.currency === "SOL");

      // Fetch unclaimed shop sales (stickers, emotes)
      const { data: shopItemsData, error: shopItemsError } = await supabase
        .from("shop_items")
        .select("id")
        .eq("creator_id", userId);

      if (shopItemsError) throw shopItemsError;

      const shopItemIds = (shopItemsData || []).map(item => item.id);
      
      let shopMon: CurrencyEarnings = { ...emptyEarnings };
      let shopSol: CurrencyEarnings = { ...emptyEarnings };

      if (shopItemIds.length > 0) {
        const { data: purchasesData, error: purchasesError } = await supabase
          .from("shop_purchases")
          .select("id, price_paid, item_id, currency")
          .in("item_id", shopItemIds)
          .eq("creator_claimed", false);

        if (purchasesError) throw purchasesError;

        const purchasesMon = (purchasesData || []).filter(p => p.currency !== "SOL");
        const purchasesSol = (purchasesData || []).filter(p => p.currency === "SOL");

        shopMon = {
          amount: purchasesMon.reduce((sum, p) => sum + Number(p.price_paid), 0),
          count: purchasesMon.length,
          ids: purchasesMon.map(p => p.id)
        };

        shopSol = {
          amount: purchasesSol.reduce((sum, p) => sum + Number(p.price_paid), 0),
          count: purchasesSol.length,
          ids: purchasesSol.map(p => p.id)
        };
      }

      setEarnings({
        donations: {
          mon: {
            amount: donationsMon.reduce((sum, d) => sum + Number(d.amount), 0),
            count: donationsMon.length,
            ids: donationsMon.map(d => d.id)
          },
          sol: {
            amount: donationsSol.reduce((sum, d) => sum + Number(d.amount), 0),
            count: donationsSol.length,
            ids: donationsSol.map(d => d.id)
          }
        },
        nftSales: {
          mon: {
            amount: nftSalesMon.reduce((sum, s) => sum + Number(s.price), 0),
            count: nftSalesMon.length,
            ids: nftSalesMon.map(s => s.id)
          },
          sol: {
            amount: nftSalesSol.reduce((sum, s) => sum + Number(s.price), 0),
            count: nftSalesSol.length,
            ids: nftSalesSol.map(s => s.id)
          }
        },
        shopSales: {
          mon: shopMon,
          sol: shopSol
        }
      });
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast.error("Failed to fetch earnings");
    }
    setIsLoading(false);
  };

  const getCurrencyKey = (currency: CurrencyType): "mon" | "sol" => {
    // Always return "sol" since we only use SOL now (but keep "mon" key for backward compat with existing data)
    return currency === "SOL" ? "sol" : "sol";
  };

  const handleClaim = async (type: "donations" | "nftSales" | "shopSales", currency: CurrencyType) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet to claim funds");
      return;
    }

    // Check wallet type matches currency (only Solana supported now)
    if (chainType !== "solana") {
      toast.error("Please connect a Solana wallet to claim SOL");
      return;
    }

    const key = getCurrencyKey(currency);
    setClaimingType(`${type}-${currency}`);

    try {
      const earningsData = earnings[type][key];
      
      if (type === "donations" && earningsData.ids.length > 0) {
        const { error } = await supabase
          .from("earnings")
          .update({ is_claimed: true, claimed_at: new Date().toISOString() })
          .in("id", earningsData.ids);
        
        if (error) throw error;
        toast.success(`Claimed ${earningsData.amount.toFixed(4)} ${currency} from donations!`);
      } 
      else if (type === "nftSales" && earningsData.ids.length > 0) {
        const { error } = await supabase
          .from("nft_listings")
          .update({ seller_claimed: true, seller_claimed_at: new Date().toISOString() })
          .in("id", earningsData.ids);
        
        if (error) throw error;
        toast.success(`Claimed ${earningsData.amount.toFixed(4)} ${currency} from NFT sales!`);
      }
      else if (type === "shopSales" && earningsData.ids.length > 0) {
        const { error } = await supabase
          .from("shop_purchases")
          .update({ creator_claimed: true, creator_claimed_at: new Date().toISOString() })
          .in("id", earningsData.ids);
        
        if (error) throw error;
        toast.success(`Claimed ${earningsData.amount.toFixed(4)} ${currency} from shop sales!`);
      }

      await fetchEarnings();
    } catch (error) {
      console.error("Error claiming funds:", error);
      toast.error("Failed to claim funds. Please try again.");
    }

    setClaimingType(null);
  };

  const handleClaimAll = async (currency: CurrencyType) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet to claim funds");
      return;
    }

    if (chainType !== "solana") {
      toast.error("Please connect a Solana wallet to claim SOL");
      return;
    }

    const key = getCurrencyKey(currency);
    setClaimingType(`all-${currency}`);

    try {
      const promises = [];

      if (earnings.donations[key].ids.length > 0) {
        promises.push(
          supabase
            .from("earnings")
            .update({ is_claimed: true, claimed_at: new Date().toISOString() })
            .in("id", earnings.donations[key].ids)
        );
      }

      if (earnings.nftSales[key].ids.length > 0) {
        promises.push(
          supabase
            .from("nft_listings")
            .update({ seller_claimed: true, seller_claimed_at: new Date().toISOString() })
            .in("id", earnings.nftSales[key].ids)
        );
      }

      if (earnings.shopSales[key].ids.length > 0) {
        promises.push(
          supabase
            .from("shop_purchases")
            .update({ creator_claimed: true, creator_claimed_at: new Date().toISOString() })
            .in("id", earnings.shopSales[key].ids)
        );
      }

      await Promise.all(promises);
      const total = getTotalClaimable(currency);
      toast.success(`Successfully claimed ${total.toFixed(4)} ${currency}!`);
      await fetchEarnings();
    } catch (error) {
      console.error("Error claiming all funds:", error);
      toast.error("Failed to claim funds. Please try again.");
    }

    setClaimingType(null);
  };

  const getTotalClaimable = (currency: CurrencyType) => {
    const key = getCurrencyKey(currency);
    return earnings.donations[key].amount + earnings.nftSales[key].amount + earnings.shopSales[key].amount;
  };

  const totalSol = getTotalClaimable("SOL");

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

  const renderEarningsForCurrency = (currency: CurrencyType) => {
    const key = getCurrencyKey(currency);
    const total = getTotalClaimable(currency);
    const symbol = currency === "SOL" ? "◎" : "⟠";
    const walletAddress = currency === "SOL" ? solWalletAddress : payoutWalletAddress;
    const isCorrectWallet = currency === "SOL" ? chainType === "solana" : chainType !== "solana";

    const earningCategories = [
      {
        id: "donations" as const,
        label: "Stream Donations",
        icon: Gift,
        data: earnings.donations[key],
        color: "text-pink-500",
        bgColor: "bg-pink-500/10",
        borderColor: "border-pink-500/30",
      },
      {
        id: "nftSales" as const,
        label: "NFT Sales",
        icon: ImageIcon,
        data: earnings.nftSales[key],
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
      },
      {
        id: "shopSales" as const,
        label: "Stickers & Emotes",
        icon: Sparkles,
        data: earnings.shopSales[key],
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
      },
    ];

    return (
      <div className="space-y-4">
        {/* Total Claimable */}
        <div className={`p-4 rounded-xl bg-gradient-to-br ${currency === "SOL" ? "from-purple-500/10 via-purple-500/5 to-indigo-500/10 border-purple-500/30" : "from-primary/10 via-primary/5 to-purple-500/10 border-primary/30"} border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Claimable</p>
              <p className={`text-3xl font-bold ${currency === "SOL" ? "text-purple-500" : "text-primary"}`}>
                {symbol} {total.toFixed(4)} <span className="text-lg">{currency}</span>
              </p>
            </div>
            {total > 0 && (
              <Button
                onClick={() => handleClaimAll(currency)}
                disabled={claimingType !== null || !isConnected || !isCorrectWallet}
                className={currency === "SOL" ? "bg-purple-500 hover:bg-purple-600" : "bg-primary hover:bg-primary/90"}
              >
                {claimingType === `all-${currency}` ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Claim All
              </Button>
            )}
          </div>
          
          {/* Wallet Info */}
          <div className="mt-3 pt-3 border-t border-current/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payout to:</span>
              {walletAddress ? (
                <span className="font-mono text-foreground">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              ) : isConnected && isCorrectWallet && address ? (
                <span className="font-mono text-muted-foreground">
                  {address.slice(0, 6)}...{address.slice(-4)} (connected)
                </span>
              ) : (
                <span className="text-muted-foreground italic">No wallet configured</span>
              )}
              <a 
                href="/edit-profile" 
                className="text-primary hover:underline flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                Configure
              </a>
            </div>
          </div>

          {/* Wrong wallet warning */}
          {isConnected && !isCorrectWallet && total > 0 && (
            <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-500">
                {currency === "SOL" 
                  ? "Connect a Solana wallet to claim SOL" 
                  : "Connect an EVM wallet to claim MON"}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Individual Categories */}
        <div className="space-y-3">
          {earningCategories.map((category) => {
            const Icon = category.icon;
            const hasClaimable = category.data.amount > 0;

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
                        {category.data.count} {category.data.count === 1 ? "transaction" : "transactions"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold ${hasClaimable ? category.color : "text-muted-foreground"}`}>
                        {symbol} {category.data.amount.toFixed(4)} {currency}
                      </p>
                    </div>
                    {hasClaimable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClaim(category.id, currency)}
                        disabled={claimingType !== null || !isCorrectWallet}
                        className={`border-2 ${category.borderColor} hover:${category.bgColor}`}
                      >
                        {claimingType === `${category.id}-${currency}` ? (
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

        {total === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No unclaimed {currency} funds at the moment</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Claim Funds
          {totalSol > 0 && (
            <Badge className="ml-auto bg-green-500/20 text-green-500 border-green-500/30">
              <TrendingUp className="w-3 h-3 mr-1" />
              Funds Available
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderEarningsForCurrency("SOL")}
      </CardContent>
    </Card>
  );
};

export default ClaimFunds;
