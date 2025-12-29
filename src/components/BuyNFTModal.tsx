import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2, CheckCircle, AlertCircle, ExternalLink, Tag, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseEther, encodeFunctionData } from "viem";
import { NFT_CONTRACT_ABI } from "@/config/nftContract";

interface Listing {
  id: string;
  nft_id: string;
  seller_id: string;
  seller_address: string;
  price: number;
  currency: string;
  nft: {
    id: string;
    token_id: number;
    name: string | null;
    image_url: string | null;
    collection_id: string | null;
    owner_address: string;
    collection?: {
      name: string;
      contract_address: string | null;
    };
  };
}

interface BuyNFTModalProps {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BuyNFTModal({ listing, open, onOpenChange, onSuccess }: BuyNFTModalProps) {
  const [isBuying, setIsBuying] = useState(false);
  const [buyStatus, setBuyStatus] = useState<'idle' | 'confirming' | 'processing' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    if (!listing || !window.ethereum) {
      setError("Please connect your wallet to buy this NFT");
      return;
    }

    setIsBuying(true);
    setBuyStatus('confirming');
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to buy an NFT");
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error("No wallet connected");
      }
      const buyerAddress = accounts[0];

      // Check if buyer is the seller
      if (buyerAddress.toLowerCase() === listing.seller_address.toLowerCase()) {
        throw new Error("You cannot buy your own NFT");
      }

      const contractAddress = listing.nft.collection?.contract_address;
      if (!contractAddress) {
        throw new Error("Contract address not found");
      }

      // In a real marketplace, you'd use a marketplace contract
      // For now, we'll simulate by just sending the payment and updating the database
      // The actual transfer would happen through a smart contract

      // Send payment to seller
      const priceInWei = parseEther(listing.price.toString());
      
      setBuyStatus('processing');

      const paymentTxHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: buyerAddress,
          to: listing.seller_address,
          value: `0x${priceInWei.toString(16)}`,
        }],
      }) as string;

      setTxHash(paymentTxHash);

      // Wait for payment confirmation
      let receipt = null;
      while (!receipt) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [paymentTxHash],
        });
      }

      // Update the listing status
      const { error: updateError } = await supabase
        .from('nft_listings')
        .update({
          status: 'sold',
          sold_at: new Date().toISOString(),
          buyer_id: user.id,
          buyer_address: buyerAddress,
          tx_hash: paymentTxHash,
        })
        .eq('id', listing.id);

      if (updateError) throw updateError;

      // Update NFT ownership in database
      await supabase
        .from('minted_nfts')
        .update({
          owner_id: user.id,
          owner_address: buyerAddress,
        })
        .eq('id', listing.nft_id);

      // Record the transaction
      await supabase
        .from('nft_transactions')
        .insert({
          collection_id: listing.nft.collection_id,
          user_id: user.id,
          tx_hash: paymentTxHash,
          tx_type: 'purchase',
          price_paid: listing.price,
          quantity: 1,
          token_ids: [listing.nft.token_id],
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        });

      setBuyStatus('success');
      toast({
        title: "Purchase Successful!",
        description: `You now own ${listing.nft.name || `Token #${listing.nft.token_id}`}`,
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }, 2000);
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || "Failed to complete purchase");
      setBuyStatus('error');
    } finally {
      setIsBuying(false);
    }
  };

  const resetForm = () => {
    setBuyStatus('idle');
    setTxHash(null);
    setError(null);
  };

  if (!listing) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Buy NFT
          </DialogTitle>
          <DialogDescription>
            Confirm your purchase details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* NFT Preview */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            {listing.nft.image_url ? (
              <img
                src={listing.nft.image_url}
                alt={listing.nft.name || `Token #${listing.nft.token_id}`}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                <Tag className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium">{listing.nft.name || `Token #${listing.nft.token_id}`}</p>
              {listing.nft.collection && (
                <p className="text-sm text-muted-foreground">{listing.nft.collection.name}</p>
              )}
              <Badge variant="outline" className="mt-1">
                #{listing.nft.token_id}
              </Badge>
            </div>
          </div>

          {/* Price */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Price</span>
              <span className="text-2xl font-bold">{listing.price} {listing.currency}</span>
            </div>
            
            {/* Fee Disclaimer */}
            <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border/50">
              <Info className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                2.5% marketplace fee + gas fees apply.{' '}
                <Link to="/fees" className="text-primary hover:underline">
                  View pricing
                </Link>
              </p>
            </div>
          </div>

          {/* Seller Info */}
          <div className="text-sm">
            <span className="text-muted-foreground">Seller: </span>
            <span className="font-mono">
              {listing.seller_address.slice(0, 6)}...{listing.seller_address.slice(-4)}
            </span>
          </div>

          {/* Status Messages */}
          {buyStatus === 'confirming' && (
            <div className="flex items-center gap-2 text-primary bg-primary/10 p-3 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Confirm the transaction in your wallet...</span>
            </div>
          )}

          {buyStatus === 'processing' && (
            <div className="flex items-center gap-2 text-primary bg-primary/10 p-3 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing payment...</span>
            </div>
          )}

          {buyStatus === 'success' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span>Purchase successful!</span>
              </div>
              {txHash && (
                <a
                  href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View transaction <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isBuying}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleBuy}
              disabled={isBuying || buyStatus === 'success'}
            >
              {isBuying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buy for {listing.price} {listing.currency}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
