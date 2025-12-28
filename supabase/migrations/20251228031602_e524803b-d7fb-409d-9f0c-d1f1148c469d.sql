-- Create table for NFT offers/bids
CREATE TABLE public.nft_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nft_id UUID NOT NULL REFERENCES public.minted_nfts(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.nft_listings(id) ON DELETE SET NULL,
  offerer_id UUID NOT NULL,
  offerer_address TEXT NOT NULL,
  owner_id UUID NOT NULL,
  owner_address TEXT NOT NULL,
  offer_price NUMERIC NOT NULL CHECK (offer_price > 0),
  currency TEXT NOT NULL DEFAULT 'MON',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nft_offers ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX idx_nft_offers_nft_id ON public.nft_offers(nft_id);
CREATE INDEX idx_nft_offers_offerer_id ON public.nft_offers(offerer_id);
CREATE INDEX idx_nft_offers_owner_id ON public.nft_offers(owner_id);
CREATE INDEX idx_nft_offers_status ON public.nft_offers(status);

-- RLS Policies

-- Anyone can view pending offers on NFTs
CREATE POLICY "Anyone can view pending offers"
ON public.nft_offers
FOR SELECT
USING (status = 'pending');

-- Offerers can view their own offers (any status)
CREATE POLICY "Offerers can view their own offers"
ON public.nft_offers
FOR SELECT
USING (auth.uid() = offerer_id);

-- Owners can view offers on their NFTs
CREATE POLICY "Owners can view offers on their NFTs"
ON public.nft_offers
FOR SELECT
USING (auth.uid() = owner_id);

-- Users can create offers
CREATE POLICY "Users can create offers"
ON public.nft_offers
FOR INSERT
WITH CHECK (auth.uid() = offerer_id);

-- Offerers can cancel their own pending offers
CREATE POLICY "Offerers can update their own offers"
ON public.nft_offers
FOR UPDATE
USING (auth.uid() = offerer_id AND status = 'pending');

-- Owners can accept or reject offers on their NFTs
CREATE POLICY "Owners can update offers on their NFTs"
ON public.nft_offers
FOR UPDATE
USING (auth.uid() = owner_id AND status = 'pending');

-- Offerers can delete their cancelled offers
CREATE POLICY "Offerers can delete their cancelled offers"
ON public.nft_offers
FOR DELETE
USING (auth.uid() = offerer_id AND status IN ('cancelled', 'expired'));

-- Trigger to update updated_at
CREATE TRIGGER update_nft_offers_updated_at
BEFORE UPDATE ON public.nft_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();