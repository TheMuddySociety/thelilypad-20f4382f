import { useState, useEffect } from "react";
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
  AlertCircle,
  ExternalLink,
  Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isUserRejection, getErrorMessage } from "@/lib/errorUtils";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getSolanaRpcUrl } from "@/config/solana";

// Platform treasury address for receiving bundle payments (Solana)
const PLATFORM_TREASURY_ADDRESS = "11111111111111111111111111111112"; // Replace with actual treasury

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
  bundle_price_sol?: number;
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
  const { address, isConnected, connect, balance, network, getSolanaProvider } = useWallet();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [purchaseStep, setPurchaseStep] = useState<"idle" | "confirming" | "processing" | "complete">("idle");

  // Price in SOL (use bundle_price_sol if available, otherwise estimate)
  const priceInSol = bundle.bundle_price_sol || bundle.bundle_price * 0.01; // Rough estimate

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
      }

      // Check which individual items user already owns
      const itemIds = bundleItems.map(bi => bi.item_id);
      const { data: purchases } = await supabase
        .from("shop_purchases")
        .select("item_id")
        .eq("user_id", userId)
        .in("item_id", itemIds);

      if (purchases) {
        setOwnedItems(purchases.map(p => p.item_id));
      }
    };

    checkExistingPurchases();
  }, [userId, open, bundle.id, bundleItems]);

  const handlePurchase = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!userId) {
      toast.error("Please sign in to purchase");
      return;
    }

    const userBalance = parseFloat(balance || "0");
    if (userBalance < priceInSol) {
      toast.error(`Insufficient balance. You need ${priceInSol.toFixed(4)} SOL`);
      return;
    }

    setIsPurchasing(true);
    setPurchaseStep("confirming");

    try {
      const provider = getSolanaProvider();
      if (!provider || !provider.publicKey) {
        throw new Error("Solana wallet not connected");
      }

      setPurchaseStep("processing");

      // Create Solana transaction
      const connection = new Connection(getSolanaRpcUrl(network), 'confirmed');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: new PublicKey(PLATFORM_TREASURY_ADDRESS),
          lamports: Math.floor(priceInSol * LAMPORTS_PER_SOL),
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = provider.publicKey;

      const signed = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      setTxHash(signature);

      // Record purchase in database
      const { error: purchaseError } = await supabase
        .from("shop_bundle_purchases")
        .insert({
          bundle_id: bundle.id,
          user_id: userId,
          price_paid: priceInSol,
          tx_hash: signature,
          currency: "SOL",
        });

      if (purchaseError) throw purchaseError;

      // Add individual items to user's purchases
      const itemPurchases = bundleItems.map(bi => ({
        item_id: bi.item_id,
        user_id: userId,
        price_paid: 0, // Part of bundle
        tx_hash: signature,
        currency: "SOL",
      }));

      await supabase.from("shop_purchases").insert(itemPurchases);

      setPurchaseStep("complete");
      setHasPurchased(true);

      toast.success("Bundle purchased successfully!");
      onPurchaseComplete?.();

    } catch (error: any) {
      console.error("Purchase failed:", error);

      if (isUserRejection(error)) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(getErrorMessage(error) || "Failed to complete purchase");
      }

      setPurchaseStep("idle");
    } finally {
      setIsPurchasing(false);
    }
  };

  const explorerUrl = network === 'mainnet'
    ? `https://explorer.solana.com/tx/${txHash}`
    : `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {bundle.name}
          </DialogTitle>
          <DialogDescription>
            {bundle.description || "Get this exclusive bundle at a discounted price"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bundle Image */}
          {bundle.image_url && (
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={bundle.image_url}
                alt={bundle.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Price Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground line-through">
                  ${bundle.original_price.toFixed(2)}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {priceInSol.toFixed(4)} SOL
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                <Percent className="w-3 h-3 mr-1" />
                {bundle.discount_percent}% OFF
              </Badge>
            </div>
          </div>

          {/* Items in Bundle */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Includes:</div>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {bundleItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                      {item.shop_items.image_url && (
                        <img
                          src={item.shop_items.image_url}
                          alt={item.shop_items.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.shop_items.name}</div>
                      <div className="text-xs text-muted-foreground">{item.shop_items.category}</div>
                    </div>
                    {ownedItems.includes(item.item_id) && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Owned
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Purchase Status */}
          {purchaseStep === "complete" && txHash && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-500 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Purchase Complete!</span>
              </div>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View transaction <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Action Button */}
          {!isConnected ? (
            <Button className="w-full" onClick={() => connect()}>
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          ) : hasPurchased ? (
            <Button className="w-full" variant="secondary" onClick={() => navigate("/my-purchases")}>
              <Gift className="w-4 h-4 mr-2" />
              View My Purchases
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handlePurchase}
              disabled={isPurchasing}
            >
              {purchaseStep === "confirming" && (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirm in wallet...
                </>
              )}
              {purchaseStep === "processing" && (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              )}
              {purchaseStep === "idle" && (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Purchase for {priceInSol.toFixed(4)} SOL
                </>
              )}
            </Button>
          )}

          {/* Balance Info */}
          {isConnected && !hasPurchased && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Your balance:</span>
              <span>{parseFloat(balance || "0").toFixed(4)} SOL</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BundlePurchaseModal;
