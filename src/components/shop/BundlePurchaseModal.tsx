import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/providers/WalletProvider";
import { toast } from "sonner";
import { 
  Package, 
  Loader2, 
  Check, 
  Wallet, 
  ShoppingCart, 
  Percent, 
  Gift,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BundleItem {
  id: string;
  bundle_id: string;
  item_id: string;
  shop_items: {
    id: string;
    name: string;
    image_url: string | null;
    category: string;
    price_mon: number;
  };
}

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  discount_percent: number;
  original_price: number;
  bundle_price: number;
}

interface BundlePurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle: Bundle;
  bundleItems: BundleItem[];
  onPurchaseComplete?: () => void;
}

export const BundlePurchaseModal: React.FC<BundlePurchaseModalProps> = ({
  open,
  onOpenChange,
  bundle,
  bundleItems,
  onPurchaseComplete,
}) => {
  const navigate = useNavigate();
  const { address, isConnected, connect } = useWallet();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const checkExistingPurchases = async () => {
      if (!userId || !open) return;

      // Check if user already owns the bundle
      const { data: bundlePurchase } = await supabase
        .from("shop_bundle_purchases")
        .select("id")
        .eq("bundle_id", bundle.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (bundlePurchase) {
        setHasPurchased(true);
        return;
      }

      // Check which individual items user already owns
      const itemIds = bundleItems.map(bi => bi.item_id);
      const { data: existingPurchases } = await supabase
        .from("shop_purchases")
        .select("item_id")
        .eq("user_id", userId)
        .in("item_id", itemIds);

      setOwnedItems(existingPurchases?.map(p => p.item_id) || []);
    };

    checkExistingPurchases();
  }, [userId, bundle.id, bundleItems, open]);

  const savings = bundle.original_price - bundle.bundle_price;
  const newItems = bundleItems.filter(bi => !ownedItems.includes(bi.item_id));

  const handlePurchase = async () => {
    if (!userId) {
      toast.error("Please sign in to purchase");
      navigate("/auth");
      return;
    }

    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsPurchasing(true);
    try {
      // In a real implementation, this would trigger a blockchain transaction
      // For now, we'll simulate the purchase with a database record
      
      // Record the bundle purchase
      const { error: bundlePurchaseError } = await supabase
        .from("shop_bundle_purchases")
        .insert({
          bundle_id: bundle.id,
          user_id: userId,
          price_paid: bundle.bundle_price,
          tx_hash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
        });

      if (bundlePurchaseError) {
        if (bundlePurchaseError.code === "23505") {
          toast.error("You already own this bundle!");
          setHasPurchased(true);
          return;
        }
        throw bundlePurchaseError;
      }

      // Grant access to all items in the bundle that user doesn't already own
      const newPurchases = newItems.map(bi => ({
        item_id: bi.item_id,
        user_id: userId,
        price_paid: 0, // Purchased as part of bundle
        tx_hash: null,
      }));

      if (newPurchases.length > 0) {
        const { error: itemsPurchaseError } = await supabase
          .from("shop_purchases")
          .insert(newPurchases);

        if (itemsPurchaseError) {
          console.error("Error granting item access:", itemsPurchaseError);
          // Don't throw - bundle purchase was successful
        }
      }

      setHasPurchased(true);
      toast.success("Bundle purchased successfully! You now have access to all included packs.");
      onPurchaseComplete?.();
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Failed to complete purchase. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {bundle.name}
          </DialogTitle>
          <DialogDescription>
            {bundle.description || "Get this amazing bundle deal!"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Discount Banner */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-green-600">{bundle.discount_percent}% OFF</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground line-through">{bundle.original_price} MON</p>
              <p className="text-lg font-bold text-green-600">Save {savings.toFixed(2)} MON</p>
            </div>
          </div>

          {/* Included Items */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-primary" />
              <span className="font-medium">Included Packs ({bundleItems.length})</span>
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {bundleItems.map((item) => {
                  const isOwned = ownedItems.includes(item.item_id);
                  return (
                    <div 
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isOwned ? "bg-muted/50 border-muted" : "border-border"
                      }`}
                    >
                      {item.shop_items.image_url ? (
                        <img 
                          src={item.shop_items.image_url}
                          alt={item.shop_items.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.shop_items.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {item.shop_items.category.replace("_", " ")}
                        </p>
                      </div>
                      <div className="text-right">
                        {isOwned ? (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="w-3 h-3" />
                            Owned
                          </Badge>
                        ) : (
                          <span className="text-sm font-medium">{item.shop_items.price_mon} MON</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Owned Items Notice */}
          {ownedItems.length > 0 && !hasPurchased && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                You already own {ownedItems.length} of {bundleItems.length} packs. 
                The bundle still offers great value for the remaining items!
              </p>
            </div>
          )}

          <Separator className="my-4" />

          {/* Pricing Summary */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items Value:</span>
              <span className="line-through text-muted-foreground">{bundle.original_price} MON</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Bundle Discount:</span>
              <span>-{savings.toFixed(2)} MON</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-primary">{bundle.bundle_price} MON</span>
            </div>
          </div>

          {/* Wallet Status */}
          {!hasPurchased && (
            <div className="bg-muted/30 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Wallet</span>
                </div>
                {isConnected ? (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="w-3 h-3" />
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleConnectWallet}>
                    Connect
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Purchase Button */}
        <div className="pt-4 border-t">
          {hasPurchased ? (
            <Button disabled className="w-full gap-2" variant="secondary">
              <Check className="w-4 h-4" />
              Bundle Owned
            </Button>
          ) : !userId ? (
            <Button 
              onClick={() => navigate("/auth")}
              className="w-full gap-2"
            >
              Sign In to Purchase
            </Button>
          ) : !isConnected ? (
            <Button 
              onClick={handleConnectWallet}
              className="w-full gap-2"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet to Purchase
            </Button>
          ) : (
            <Button 
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="w-full gap-2 h-12 text-lg"
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Buy Bundle for {bundle.bundle_price} MON
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
