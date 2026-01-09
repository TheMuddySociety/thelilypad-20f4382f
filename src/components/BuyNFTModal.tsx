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
import { ShoppingCart, Loader2, Info } from "lucide-react";
import { Link } from "react-router-dom";

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

  const handleBuy = async () => {
    // Stub for Solana
    console.log("Buy Not Implemented Yet for Solana");
  };

  if (!listing) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Buy NFT (Solana Coming Soon)
          </DialogTitle>
          <DialogDescription>
            Marketplace logic is being migrated to Solana.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            {/* Preview */}
            {listing.nft.image_url && (
              <img src={listing.nft.image_url} alt="NFT" className="w-16 h-16 rounded object-cover" />
            )}
            <div>
              <p className="font-medium">{listing.nft.name}</p>
              <p className="text-sm">{listing.price} SOL</p>
            </div>
          </div>
          <Button disabled className="w-full">
            Purchase Coming Soon
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
