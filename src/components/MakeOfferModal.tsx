import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Tag, Clock, MessageSquare, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/providers/WalletProvider";

interface MakeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nft: {
    id: string;
    name: string | null;
    image_url: string | null;
    owner_id: string;
    owner_address: string;
    token_id: number;
  };
  listingPrice?: number | null;
  onOfferMade?: () => void;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
  open,
  onOpenChange,
  nft,
  listingPrice,
  onOfferMade,
}) => {
  const { address, isConnected } = useWallet();
  const [offerPrice, setOfferPrice] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(addDays(new Date(), 7));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    const price = parseFloat(offerPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid offer amount");
      return;
    }

    if (listingPrice && price >= listingPrice) {
      toast.error("Offer must be below the listing price", {
        description: `Current listing price is ${listingPrice} MON`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to make an offer");
        return;
      }

      if (user.id === nft.owner_id) {
        toast.error("You cannot make an offer on your own NFT");
        return;
      }

      const { error } = await supabase.from("nft_offers").insert({
        nft_id: nft.id,
        offerer_id: user.id,
        offerer_address: address,
        owner_id: nft.owner_id,
        owner_address: nft.owner_address,
        offer_price: price,
        message: message.trim() || null,
        expires_at: expiresAt?.toISOString() || null,
      });

      if (error) throw error;

      toast.success("Offer submitted!", {
        description: `Your offer of ${price} MON has been sent`,
      });

      onOpenChange(false);
      onOfferMade?.();
      setOfferPrice("");
      setMessage("");
    } catch (error: any) {
      console.error("Error making offer:", error);
      toast.error("Failed to submit offer", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Make an Offer
          </DialogTitle>
          <DialogDescription>
            Submit an offer for {nft.name || `Token #${nft.token_id}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NFT Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            {nft.image_url ? (
              <img
                src={nft.image_url}
                alt={nft.name || "NFT"}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <Tag className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{nft.name || `Token #${nft.token_id}`}</p>
              {listingPrice && (
                <p className="text-sm text-muted-foreground">
                  Listed for {listingPrice} MON
                </p>
              )}
            </div>
          </div>

          {/* Offer Amount */}
          <div className="space-y-2">
            <Label htmlFor="offerPrice">Your Offer</Label>
            <div className="relative">
              <Input
                id="offerPrice"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.00"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="pr-16"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                MON
              </span>
            </div>
            {listingPrice && (
              <p className="text-xs text-muted-foreground">
                Must be less than {listingPrice} MON
              </p>
            )}
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Offer Expires
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expiresAt && "text-muted-foreground"
                  )}
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
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              {[1, 3, 7, 14].map((days) => (
                <Button
                  key={days}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExpiresAt(addDays(new Date(), days))}
                  className="flex-1 text-xs"
                >
                  {days}d
                </Button>
              ))}
            </div>
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Message (optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Add a message to the seller..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Fee Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              If accepted, gas fees apply to complete the transfer.{' '}
              <Link to="/fees" className="text-primary hover:underline">
                View pricing
              </Link>
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isConnected}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Offer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MakeOfferModal;
