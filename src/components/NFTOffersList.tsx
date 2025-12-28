import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Check, 
  X, 
  Clock, 
  User, 
  Loader2,
  Tag,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Offer {
  id: string;
  nft_id: string;
  offerer_id: string;
  offerer_address: string;
  owner_id: string;
  offer_price: number;
  currency: string;
  status: string;
  message: string | null;
  expires_at: string | null;
  created_at: string;
}

interface NFTOffersListProps {
  nftId: string;
  isOwner: boolean;
  onOfferAccepted?: (offer: Offer) => void;
  onOffersChange?: () => void;
}

export const NFTOffersList: React.FC<NFTOffersListProps> = ({
  nftId,
  isOwner,
  onOfferAccepted,
  onOffersChange,
}) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [nftId]);

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("nft_offers")
        .select("*")
        .eq("nft_id", nftId)
        .eq("status", "pending")
        .order("offer_price", { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOffer = async (offer: Offer) => {
    if (!isOwner) return;
    setProcessingId(offer.id);

    try {
      // Update this offer to accepted
      const { error: acceptError } = await supabase
        .from("nft_offers")
        .update({ status: "accepted" })
        .eq("id", offer.id);

      if (acceptError) throw acceptError;

      // Reject all other pending offers for this NFT
      await supabase
        .from("nft_offers")
        .update({ status: "rejected" })
        .eq("nft_id", nftId)
        .eq("status", "pending")
        .neq("id", offer.id);

      toast.success("Offer accepted!", {
        description: `You accepted an offer of ${offer.offer_price} ${offer.currency}`,
      });

      onOfferAccepted?.(offer);
      onOffersChange?.();
      fetchOffers();
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      toast.error("Failed to accept offer", { description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    if (!isOwner) return;
    setProcessingId(offerId);

    try {
      const { error } = await supabase
        .from("nft_offers")
        .update({ status: "rejected" })
        .eq("id", offerId);

      if (error) throw error;

      toast.success("Offer rejected");
      onOffersChange?.();
      fetchOffers();
    } catch (error: any) {
      console.error("Error rejecting offer:", error);
      toast.error("Failed to reject offer", { description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelOffer = async (offerId: string) => {
    setProcessingId(offerId);

    try {
      const { error } = await supabase
        .from("nft_offers")
        .update({ status: "cancelled" })
        .eq("id", offerId);

      if (error) throw error;

      toast.success("Offer cancelled");
      onOffersChange?.();
      fetchOffers();
    } catch (error: any) {
      console.error("Error cancelling offer:", error);
      toast.error("Failed to cancel offer", { description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No offers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => {
        const isExpired = offer.expires_at && isPast(new Date(offer.expires_at));
        const isMyOffer = currentUserId === offer.offerer_id;
        const isProcessing = processingId === offer.id;

        return (
          <Card key={offer.id} className={isExpired ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Offer Amount */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-primary">
                      {offer.offer_price} {offer.currency}
                    </span>
                    {isExpired && (
                      <Badge variant="outline" className="text-destructive border-destructive/30">
                        Expired
                      </Badge>
                    )}
                    {isMyOffer && (
                      <Badge variant="secondary" className="text-xs">
                        Your Offer
                      </Badge>
                    )}
                  </div>

                  {/* Offerer */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {offer.offerer_address.slice(0, 6)}...{offer.offerer_address.slice(-4)}
                    </span>
                  </div>

                  {/* Expiration */}
                  {offer.expires_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {isExpired ? "Expired" : `Expires ${format(new Date(offer.expires_at), "MMM d, yyyy")}`}
                      </span>
                    </div>
                  )}

                  {/* Message */}
                  {offer.message && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />
                        <p className="text-muted-foreground italic">"{offer.message}"</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isOwner && !isExpired && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAcceptOffer(offer)}
                        disabled={isProcessing}
                        className="gap-1"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectOffer(offer.id)}
                        disabled={isProcessing}
                        className="gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </Button>
                    </>
                  )}
                  {isMyOffer && !isExpired && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelOffer(offer.id)}
                      disabled={isProcessing}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default NFTOffersList;
