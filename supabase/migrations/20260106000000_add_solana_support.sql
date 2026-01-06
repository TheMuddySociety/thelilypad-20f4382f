-- Add blockchain and solana_standard columns to collections table
ALTER TABLE public.collections 
ADD COLUMN blockchain text DEFAULT 'monad',
ADD COLUMN solana_standard text;

-- Add comment for documentation
COMMENT ON COLUMN public.collections.blockchain IS 'The blockchain where the collection is deployed (monad or solana)';
COMMENT ON COLUMN public.collections.solana_standard IS 'The Metaplex standard used if blockchain is solana (core, token-metadata, etc.)';
