import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gift, Minus, Plus, Loader2, Sparkles, Package, Wallet, ExternalLink, Star, Crown, Gem, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/providers/WalletProvider";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useBlindBoxMint } from "@/hooks/useBlindBoxMint";
import { BlindBoxReveal } from "./BlindBoxReveal";

interface BlindBoxReward {
  type: "nft" | "token" | "shop_item";
  name: string;
  value: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  weight: number;
}

interface BlindBox {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  total_supply: number;
  remaining_supply: number;
  rewards: BlindBoxReward[];
  max_per_user: number | null;
  start_date: string;
  end_date: string;
  nft_pool_address?: string;
}

interface BlindBoxPurchaseModalProps {
  box: BlindBox;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const RARITY_CONFIG = {
  common: { color: "text-zinc-400", bg: "bg-zinc-500/20", border: "border-zinc-500/30", icon: Circle },
  uncommon: { color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30", icon: Star },
  rare: { color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30", icon: Gem },
  epic: { color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", icon: Sparkles },
  legendary: { color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30", icon: Crown },
};

export const BlindBoxPurchaseModal: React.FC<BlindBoxPurchaseModalProps> = ({
  box,
  open,
  onOpenChange,
  onSuccess
}) => {
  const [quantity, setQuantity] = useState(1);
  const [userPurchases, setUserPurchases] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [rewards, setRewards] = useState<BlindBoxReward[]>([]);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const { isConnected, address, network } = useWallet();
  const { profile } = useUserProfile();
  const { purchaseBlindBox, checkPurchaseLimit, isProcessing } = useBlindBoxMint();
  const userId = profile?.id ?? null;

  const maxQuantity = box.max_per_user
    ? Math.min(box.max_per_user - userPurchases, box.remaining_supply)
    : box.remaining_supply;
  const totalCost = quantity * box.price;

  useEffect(() => {
    if (open && userId) {
      fetchUserPurchases();
      setRevealing(false);
      setRewards([]);
      setQuantity(1);
      setTxSignature(null);
    }
  }, [open, box.id, userId]);

  const fetchUserPurchases = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('lily_blind_box_purchases')
      .select('quantity')
      .eq('blind_box_id', box.id)
      .eq('user_id', userId);

    const total = (data || []).reduce((sum, p) => sum + ((p as any).quantity || 0), 0);
    setUserPurchases(total);
  };

  const handlePurchase = async () => {
    if (!isConnected) {
      toast.error("Please connect your Solana wallet");
      return;
    }

    if (!userId) {
      toast.error("Please complete your profile first");
      return;
    }

    if (quantity > maxQuantity) {
      toast.error(`You can only purchase ${maxQuantity} more boxes`);
      return;
    }

    // Use the new hook for purchase
    const results = await purchaseBlindBox(box as any, quantity, userId);

    if (results.length > 0 && results[0].success) {
      // Collect all rewards
      const wonRewards = results
        .filter(r => r.reward)
        .map(r => r.reward as BlindBoxReward);

      setRewards(wonRewards);
      setTxSignature(results[0].signature || null);
      setRevealing(true);

      toast.success(`Opening ${quantity} blind box${quantity > 1 ? 'es' : ''}...`);
      onSuccess();
    }
  };

  const getExplorerUrl = (sig: string) => {
    const base = network === 'devnet'
      ? 'https://explorer.solana.com/tx/'
      : 'https://solscan.io/tx/';
    return `${base}${sig}${network === 'devnet' ? '?cluster=devnet' : ''}`;
  };

  const getTotalWeight = () => {
    return (box.rewards || []).reduce((sum, r) => sum + (r.weight || 1), 0);
  };

  if (revealing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl bg-transparent border-none shadow-none">
          <BlindBoxReveal
            boxName={box.name}
            boxImage={box.image_url}
            rewards={rewards}
            onComplete={() => onOpenChange(false)}
          />
          {txSignature && (
            <div className="flex justify-center mt-4">
              <a
                href={getExplorerUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Open Blind Box
          </DialogTitle>
          <DialogDescription>
            Purchase "{box.name}" for a chance at mystery rewards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Wallet Connection Status */}
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3"
            >
              <Wallet className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-amber-500">
                Connect your Solana wallet to purchase
              </p>
            </motion.div>
          )}

          {/* Box Info */}
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/10 flex items-center justify-center overflow-hidden border border-border">
              {box.image_url ? (
                <img
                  src={box.image_url}
                  alt={box.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Gift className="w-10 h-10 text-primary/50" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{box.name}</h4>
              <p className="text-2xl font-bold text-primary mt-1">{box.price} SOL</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Package className="w-3 h-3 mr-1" />
                  {box.remaining_supply} left
                </Badge>
              </div>
            </div>
          </div>

          {/* Reward Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Possible Rewards</Label>
            <div className="flex flex-wrap gap-1.5">
              {(box.rewards || []).map((reward, idx) => {
                const config = RARITY_CONFIG[reward.rarity] || RARITY_CONFIG.common;
                const RarityIcon = config.icon;
                const probability = getTotalWeight() > 0
                  ? ((reward.weight / getTotalWeight()) * 100).toFixed(0)
                  : 0;

                return (
                  <Badge
                    key={idx}
                    variant="outline"
                    className={`text-[10px] ${config.color} ${config.border}`}
                    title={`${probability}% chance`}
                  >
                    <RarityIcon className="w-2.5 h-2.5 mr-1" />
                    {reward.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-3">
            <Label className="text-xs">Quantity</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
                className="w-20 text-center text-lg font-bold bg-muted/50"
                min={1}
                max={maxQuantity}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {box.max_per_user && userPurchases > 0 && (
              <p className="text-xs text-muted-foreground">
                You've purchased {userPurchases} box{userPurchases > 1 ? 'es' : ''}.
                {maxQuantity > 0 ? ` You can buy ${maxQuantity} more.` : ' Maximum reached.'}
              </p>
            )}
          </div>

          {/* Cost Summary */}
          <div className="glass-card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per Box</span>
              <span>{box.price} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantity</span>
              <span>×{quantity}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{totalCost.toFixed(2)} SOL</span>
            </div>
          </div>

          <Button
            className="w-full h-12 bg-gradient-to-r from-primary to-emerald-400 hover:opacity-90 text-base font-semibold"
            onClick={handlePurchase}
            disabled={isProcessing || maxQuantity === 0 || !isConnected}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : !isConnected ? (
              <>
                <Wallet className="w-5 h-5 mr-2" />
                Connect Wallet
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Open for {totalCost.toFixed(2)} SOL
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
