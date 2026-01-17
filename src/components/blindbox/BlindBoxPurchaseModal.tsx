import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Gift, Minus, Plus, Loader2, Sparkles, Package, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/providers/WalletProvider";
import { useUserProfile } from "@/hooks/useUserProfile";
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import { TREASURY_CONFIG } from "@/config/treasury";
import { createProtocolMemoInstruction } from "@/lib/solanaProtocol";

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

interface BlindBoxPurchaseModalProps {
  box: BlindBox;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BlindBoxPurchaseModal: React.FC<BlindBoxPurchaseModalProps> = ({
  box,
  open,
  onOpenChange,
  onSuccess
}) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userPurchases, setUserPurchases] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [rewards, setRewards] = useState<any[]>([]);
  const { toast } = useToast();
  
  const { isConnected, address, getSolanaProvider, network } = useWallet();
  const { profile } = useUserProfile();
  const userId = profile?.id ?? null;

  const maxQuantity = box.max_per_user ? Math.min(box.max_per_user - userPurchases, box.remaining_supply) : box.remaining_supply;
  const totalCost = quantity * box.price;

  useEffect(() => {
    if (open) {
      fetchUserPurchases();
      setRevealing(false);
      setRewards([]);
      setQuantity(1);
    }
  }, [open, box.id, userId]);

  const fetchUserPurchases = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('lily_blind_box_purchases')
      .select('quantity')
      .eq('blind_box_id', box.id)
      .eq('user_id', userId);

    const total = (data || []).reduce((sum, p) => sum + (p as any).quantity, 0);
    setUserPurchases(total);
  };

  const simulateRewards = () => {
    // Simulate random rewards based on the box's reward configuration
    const possibleRewards = Array.isArray(box.rewards) ? box.rewards : [];
    const simulatedRewards = [];
    
    for (let i = 0; i < quantity; i++) {
      // Simple random selection weighted by rarity
      const roll = Math.random() * 100;
      let reward;
      
      if (roll < 5) {
        reward = { type: 'legendary', name: 'Legendary NFT', rarity: 'legendary' };
      } else if (roll < 20) {
        reward = { type: 'rare', name: 'Rare Item', rarity: 'rare' };
      } else if (roll < 50) {
        reward = { type: 'uncommon', name: 'Uncommon Token', rarity: 'uncommon' };
      } else {
        reward = { type: 'common', name: 'Common Reward', rarity: 'common' };
      }
      simulatedRewards.push(reward);
    }
    
    return simulatedRewards;
  };

  const handlePurchase = async () => {
    if (!isConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your Solana wallet to purchase blind boxes",
        variant: "destructive"
      });
      return;
    }

    const solanaProvider = getSolanaProvider();
    if (!solanaProvider) {
      toast({
        title: "Wallet Error",
        description: "Solana wallet not available",
        variant: "destructive"
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile to purchase blind boxes",
        variant: "destructive"
      });
      return;
    }

    if (quantity > maxQuantity) {
      toast({
        title: "Quantity exceeded",
        description: `You can only purchase ${maxQuantity} more boxes`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Process SOL payment
      const rpcUrl = network === "mainnet" 
        ? "https://api.mainnet-beta.solana.com" 
        : "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");
      
      const fromPubkey = new PublicKey(address!);
      const treasuryPubkey = new PublicKey(TREASURY_CONFIG.treasuryWallet);
      
      // Calculate total in lamports
      const totalLamports = Math.floor(totalCost * LAMPORTS_PER_SOL);
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add transfer to treasury
      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: treasuryPubkey,
          lamports: totalLamports,
        })
      );
      
      // Add protocol memo
      transaction.add(
        createProtocolMemoInstruction("blindbox:purchase", {
          box: box.id,
          qty: quantity.toString(),
        })
      );
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;
      
      // Sign and send
      const signedTx = await solanaProvider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");
      
      // Generate rewards
      const simulatedRewards = simulateRewards();
      
      // Record purchase in database
      const { error } = await supabase
        .from('lily_blind_box_purchases')
        .insert({
          blind_box_id: box.id,
          user_id: userId,
          quantity: quantity,
          total_paid: totalCost,
          rewards_received: simulatedRewards,
          tx_hash: signature,
        } as any);

      if (error) throw error;

      // Show reveal animation
      setRevealing(true);
      setRewards(simulatedRewards);
      
      toast({
        title: "Purchase successful!",
        description: `Opening ${quantity} blind box${quantity > 1 ? 'es' : ''}...`
      });
      onSuccess();
    } catch (error: any) {
      console.error("Purchase error:", error);
      if (error.message?.includes("User rejected")) {
        toast({
          title: "Cancelled",
          description: "Transaction was cancelled",
        });
      } else {
        toast({
          title: "Purchase failed",
          description: error.message || "Failed to complete purchase",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'rare': return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
      case 'uncommon': return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  if (revealing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="text-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
            </motion.div>
            <h3 className="text-xl font-bold mb-6">Your Rewards!</h3>
            
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              <AnimatePresence>
                {rewards.map((reward, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20, rotateY: 180 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ delay: index * 0.2, duration: 0.5 }}
                    className={`p-4 rounded-lg border ${getRarityColor(reward.rarity)}`}
                  >
                    <Gift className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium text-sm">{reward.name}</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {reward.rarity}
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Awesome!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Open Blind Box
          </DialogTitle>
          <DialogDescription>
            Purchase "{box.name}" for a chance at mystery rewards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Wallet Connection Status */}
          {!isConnected && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
              <Wallet className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-amber-500">
                Connect your Solana wallet to purchase
              </p>
            </div>
          )}

          {/* Box Info */}
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              {box.image_url ? (
                <img 
                  src={box.image_url} 
                  alt={box.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Gift className="w-12 h-12 text-primary/50" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">{box.name}</h4>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">
                  <Package className="w-3 h-3 mr-1" />
                  {box.remaining_supply} left
                </Badge>
                <Badge variant="secondary">
                  {box.price} SOL
                </Badge>
              </div>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="space-y-3">
            <Label>Quantity</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
                className="w-24 text-center"
                min={1}
                max={maxQuantity}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {box.max_per_user && userPurchases > 0 && (
              <p className="text-sm text-muted-foreground">
                You've purchased {userPurchases} box{userPurchases > 1 ? 'es' : ''}. 
                {maxQuantity > 0 ? ` You can buy ${maxQuantity} more.` : ' Maximum reached.'}
              </p>
            )}
          </div>

          {/* Cost Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Price per Box</span>
              <span>{box.price} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Quantity</span>
              <span>×{quantity}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>{totalCost} SOL</span>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handlePurchase}
            disabled={loading || maxQuantity === 0 || !isConnected}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : !isConnected ? (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Open for {totalCost} SOL
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
