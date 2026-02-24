import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp } from "lucide-react";

interface Sale {
  id: string;
  buyer_address: string | null;
  price: number;
  currency: string;
  sold_at: string | null;
  nft: {
    name: string | null;
    image_url: string | null;
    collection: {
      name: string;
    } | null;
  } | null;
}

export const RecentSalesTable = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from("nft_listings")
        .select(`
          id,
          buyer_address,
          price,
          currency,
          sold_at,
          nft:minted_nfts!nft_id (
            name,
            image_url,
            collection:collections!collection_id (
              name
            )
          )
        `)
        .eq("status", "sold")
        .order("sold_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching sales:", error);
        return;
      }

      setSales(data || []);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();

    // Real-time subscription for new sales
    const channel = supabase
      .channel("recent-sales")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nft_listings" },
        fetchSales
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const truncateAddress = (address: string | null) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sales.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No sales recorded yet. Be the first to make a purchase!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Recent Sales
          <Badge variant="secondary" className="ml-2">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {sale.nft?.image_url ? (
                      <img
                        src={sale.nft.image_url}
                        alt={sale.nft.name || "NFT"}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        NFT
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">
                        {sale.nft?.name || "Unnamed NFT"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sale.nft?.collection?.name || "Unknown Collection"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    {truncateAddress(sale.buyer_address)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {sale.price} {sale.currency}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {sale.sold_at && !isNaN(new Date(sale.sold_at).getTime())
                    ? formatDistanceToNow(new Date(sale.sold_at), { addSuffix: true })
                    : "Unknown"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
