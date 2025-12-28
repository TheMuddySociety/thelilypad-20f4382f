-- Create minted NFTs table to store metadata
CREATE TABLE public.minted_nfts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  owner_address TEXT NOT NULL,
  token_id INTEGER NOT NULL,
  name TEXT,
  description TEXT,
  image_url TEXT,
  attributes JSONB DEFAULT '[]',
  tx_hash TEXT NOT NULL,
  minted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collection_id, token_id)
);

-- Enable RLS
ALTER TABLE public.minted_nfts ENABLE ROW LEVEL SECURITY;

-- Anyone can view minted NFTs (they're public on blockchain anyway)
CREATE POLICY "Anyone can view minted NFTs"
ON public.minted_nfts
FOR SELECT
USING (true);

-- Users can insert their own minted NFTs
CREATE POLICY "Users can insert their own minted NFTs"
ON public.minted_nfts
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Users can update their own NFTs (for metadata refresh)
CREATE POLICY "Users can update their own NFTs"
ON public.minted_nfts
FOR UPDATE
USING (auth.uid() = owner_id);

-- Add indexes for faster queries
CREATE INDEX idx_minted_nfts_collection_id ON public.minted_nfts(collection_id);
CREATE INDEX idx_minted_nfts_owner_id ON public.minted_nfts(owner_id);
CREATE INDEX idx_minted_nfts_owner_address ON public.minted_nfts(owner_address);