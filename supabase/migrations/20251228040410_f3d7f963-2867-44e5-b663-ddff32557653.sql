-- Enable REPLICA IDENTITY FULL for accurate change tracking
ALTER TABLE public.collections REPLICA IDENTITY FULL;
ALTER TABLE public.minted_nfts REPLICA IDENTITY FULL;
ALTER TABLE public.nft_listings REPLICA IDENTITY FULL;

-- Add remaining tables to supabase_realtime publication (streams already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.minted_nfts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nft_listings;