-- Create NFT listings table for marketplace
CREATE TABLE public.nft_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nft_id UUID NOT NULL REFERENCES public.minted_nfts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  seller_address TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MON',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  sold_at TIMESTAMP WITH TIME ZONE,
  buyer_id UUID,
  buyer_address TEXT,
  tx_hash TEXT
);

-- Enable RLS
ALTER TABLE public.nft_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings
CREATE POLICY "Anyone can view active listings"
ON public.nft_listings
FOR SELECT
USING (status = 'active');

-- Sellers can view their own listings
CREATE POLICY "Sellers can view their own listings"
ON public.nft_listings
FOR SELECT
USING (auth.uid() = seller_id);

-- Sellers can create listings
CREATE POLICY "Sellers can create listings"
ON public.nft_listings
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own listings
CREATE POLICY "Sellers can update their own listings"
ON public.nft_listings
FOR UPDATE
USING (auth.uid() = seller_id);

-- Sellers can delete their own listings
CREATE POLICY "Sellers can delete their own listings"
ON public.nft_listings
FOR DELETE
USING (auth.uid() = seller_id);

-- Create index for faster queries
CREATE INDEX idx_nft_listings_status ON public.nft_listings(status);
CREATE INDEX idx_nft_listings_nft_id ON public.nft_listings(nft_id);
CREATE INDEX idx_nft_listings_seller_id ON public.nft_listings(seller_id);