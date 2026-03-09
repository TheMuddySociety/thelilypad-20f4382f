import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Gift, Clock, Package, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useBundleCountdown, formatCountdown } from "@/hooks/useBundleCountdown";
import { BlindBoxPurchaseModal } from "@/components/blindbox/BlindBoxPurchaseModal";

interface BlindBox {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  total_supply: number;
  remaining_supply: number;
  rewards: any;
  max_per_user: number | null;
  start_date: string;
  end_date: string;
}

const BlindBoxCard: React.FC<{ box: BlindBox; onPurchase: (box: BlindBox) => void }> = ({ box, onPurchase }) => {
  const countdown = useBundleCountdown(box.start_date, box.end_date, true);
  const isActive = !countdown.isNotStarted && !countdown.isExpired && box.remaining_supply > 0;
  const soldPercentage = ((box.total_supply - box.remaining_supply) / box.total_supply) * 100;

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-all duration-300 group">
      <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        {box.image_url ? (
          <img
            src={box.image_url}
            alt={box.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gift className="w-20 h-20 text-primary/30 animate-pulse" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant={isActive ? "default" : "secondary"}>
            {countdown.isNotStarted ? "Coming Soon" :
              countdown.isExpired ? "Ended" :
                box.remaining_supply === 0 ? "Sold Out" : "Available"}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="bg-background/80">
            <Sparkles className="w-3 h-3 mr-1" />
            Mystery
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{box.name}</CardTitle>
        {box.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{box.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium">{box.remaining_supply} / {box.total_supply}</span>
          </div>
          <Progress value={soldPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span className="font-semibold">{box.price} USDC</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className={countdown.isExpired ? "text-destructive" : "text-muted-foreground"}>
              {formatCountdown(countdown)}
            </span>
          </div>
        </div>

        {box.max_per_user && (
          <p className="text-xs text-muted-foreground text-center">
            Max {box.max_per_user} per user
          </p>
        )}

        <Button
          className="w-full"
          disabled={!isActive}
          onClick={() => onPurchase(box)}
        >
          {countdown.isNotStarted ? "Coming Soon" :
            countdown.isExpired ? "Event Ended" :
              box.remaining_supply === 0 ? "Sold Out" :
                "Open Blind Box"}
        </Button>
      </CardContent>
    </Card>
  );
};

const BlindBoxes: React.FC = () => {
  const [blindBoxes, setBlindBoxes] = useState<BlindBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState<BlindBox | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlindBoxes();
  }, []);

  const fetchBlindBoxes = async () => {
    try {
      const { data, error } = await supabase
        .from('lily_blind_boxes')
        .select('*')
        .eq('is_active', true)
        .order('end_date', { ascending: true });

      if (error) throw error;
      setBlindBoxes((data || []) as unknown as BlindBox[]);
    } catch (error: any) {
      toast({
        title: "Error loading blind boxes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" />
            Lily Blind Boxes
          </h1>
          <p className="text-muted-foreground">
            Open mystery boxes for a chance at rare NFTs, tokens, and exclusive rewards
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : blindBoxes.length === 0 ? (
          <Card className="p-12 text-center">
            <Gift className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Blind Boxes</h3>
            <p className="text-muted-foreground">Check back soon for new mystery box events!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {blindBoxes.map((box) => (
              <BlindBoxCard
                key={box.id}
                box={box}
                onPurchase={setSelectedBox}
              />
            ))}
          </div>
        )}
      </main>

      {selectedBox && (
        <BlindBoxPurchaseModal
          box={selectedBox}
          open={!!selectedBox}
          onOpenChange={(open) => !open && setSelectedBox(null)}
          onSuccess={fetchBlindBoxes}
        />
      )}
    </div>
  );
};

export default BlindBoxes;
