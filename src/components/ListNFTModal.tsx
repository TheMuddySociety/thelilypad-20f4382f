import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tag, CalendarIcon, Loader2, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { useMarketplaceContract } from "@/hooks/useMarketplaceContract";

interface MintedNFT {
  id: string;
  token_id: number;
  name: string | null;
  image_url: string | null;
  collection_id: string | null;
  owner_address: string;
  owner_id: string;
  collection?: {
    contract_address: string | null;
  };
}

interface ListNFTModalProps {
  nft: MintedNFT | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ListNFTModal({ nft, open, onOpenChange, onSuccess }: ListNFTModalProps) {
  const [price, setPrice] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(addDays(new Date(), 7));
  const [isListing, setIsListing] = useState(false);
  const [listingStatus, setListingStatus] = useState<'idle' | 'approving' | 'listing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { listItem, setApprovalForAll, checkApproval } = useMarketplaceContract();

  const handleList = async () => {
    if (!nft || !price || parseFloat(price) <= 0) {
      setError("Please enter a valid price");
      return;
    }

    const nftAddress = nft.collection?.contract_address;
    if (!nftAddress) {
      setError("NFT contract address not found");
      return;
    }

    setIsListing(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to list an NFT");
      }

      // 1. Approval Step
      setListingStatus('approving');
      const isApproved = await checkApproval(nftAddress);
      if (!isApproved) {
        const approveTx = await setApprovalForAll(nftAddress, true);
        // Wait for approval receipt
        let receipt = null;
        while (!receipt) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          receipt = await window.ethereum?.request({
            method: 'eth_getTransactionReceipt',
            params: [approveTx],
          });
        }
      }

      // 2. Listing Step (currently database-only, escrow pending deployment)
      setListingStatus('listing');
      const listResult = await listItem(nftAddress, parseFloat(price) * 1e9, { expiresAt });

      // 3. Supabase Record
      const { error: insertError } = await supabase
        .from('nft_listings')
        .insert([{
          nft_id: nft.id,
          seller_id: user.id,
          seller_address: nft.owner_address,
          price: parseFloat(price),
          currency: 'SOL',
          expires_at: expiresAt?.toISOString() || null,
          tx_hash: listResult.listingId || null,
        }]);

      if (insertError) throw insertError;

      setListingStatus('success');
      toast({
        title: "NFT Listed!",
        description: `Your NFT is now listed for ${price} SOL`,
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (err: any) {
      console.error('Listing error:', err);
      setError(err.message || "Failed to list NFT");
      setListingStatus('error');
    } finally {
      setIsListing(false);
    }
  };

  const resetForm = () => {
    setPrice("");
    setExpiresAt(addDays(new Date(), 7));
    setListingStatus('idle');
    setError(null);
  };

  if (!nft) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            List NFT for Sale
          </DialogTitle>
          <DialogDescription>
            Set a price and optional expiration for your listing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* NFT Preview */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            {nft.image_url ? (
              <img
                src={nft.image_url}
                alt={nft.name || `Token #${nft.token_id}`}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{nft.name || `Token #${nft.token_id}`}</p>
              <Badge variant="outline" className="mt-1">
                #{nft.token_id}
              </Badge>
            </div>
          </div>

          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price">Price (SOL)</Label>
            <div className="relative">
              <Input
                id="price"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isListing}
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                SOL
              </span>
            </div>
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label>Expiration (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expiresAt && "text-muted-foreground"
                  )}
                  disabled={isListing}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, "PPP") : "No expiration"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={setExpiresAt}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fee Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              A 2.5% marketplace fee will be deducted from your sale.{' '}
              <Link to="/fees" className="text-primary hover:underline">
                Learn more
              </Link>
            </p>
          </div>
          {listingStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span>NFT listed successfully!</span>
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
              disabled={isListing}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleList}
              disabled={isListing || !price || parseFloat(price) <= 0}
            >
              {isListing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Listing...
                </>
              ) : (
                <>
                  <Tag className="mr-2 h-4 w-4" />
                  List for {price || '0'} SOL
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
