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
import { Tag, CalendarIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MintedNFT {
  id: string;
  token_id: number;
  name: string | null;
  image_url: string | null;
  collection_id: string | null;
  owner_address: string;
  owner_id: string;
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
  const [listingStatus, setListingStatus] = useState<'idle' | 'listing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleList = async () => {
    if (!nft || !price || parseFloat(price) <= 0) {
      setError("Please enter a valid price");
      return;
    }

    setIsListing(true);
    setListingStatus('listing');
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to list an NFT");
      }

      // Check if NFT is already listed
      const { data: existingListing } = await supabase
        .from('nft_listings')
        .select('id')
        .eq('nft_id', nft.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingListing) {
        throw new Error("This NFT is already listed for sale");
      }

      // Create the listing
      const { error: insertError } = await supabase
        .from('nft_listings')
        .insert({
          nft_id: nft.id,
          seller_id: user.id,
          seller_address: nft.owner_address,
          price: parseFloat(price),
          currency: 'MON',
          expires_at: expiresAt?.toISOString() || null,
        });

      if (insertError) throw insertError;

      setListingStatus('success');
      toast({
        title: "NFT Listed!",
        description: `Your NFT is now listed for ${price} MON`,
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
            <Label htmlFor="price">Price (MON)</Label>
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
                MON
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

          {/* Status Messages */}
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
                  List for {price || '0'} MON
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
