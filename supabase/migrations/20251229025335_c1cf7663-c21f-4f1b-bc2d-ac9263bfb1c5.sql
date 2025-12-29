-- Add reveal status to collections
ALTER TABLE public.collections ADD COLUMN is_revealed boolean NOT NULL DEFAULT false;

-- Add reveal status to individual minted NFTs  
ALTER TABLE public.minted_nfts ADD COLUMN is_revealed boolean NOT NULL DEFAULT false;

-- Add revealed_at timestamp to minted NFTs
ALTER TABLE public.minted_nfts ADD COLUMN revealed_at timestamp with time zone;