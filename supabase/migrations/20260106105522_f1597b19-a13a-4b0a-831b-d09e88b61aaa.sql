-- Add chain column to collections table to track Monad vs Solana collections
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS chain TEXT NOT NULL DEFAULT 'monad';

-- Add comment explaining the column
COMMENT ON COLUMN public.collections.chain IS 'The blockchain network: monad or solana';

-- Create an index for filtering by chain
CREATE INDEX IF NOT EXISTS idx_collections_chain ON public.collections(chain);

-- Update existing collections to have 'monad' as the default chain
UPDATE public.collections SET chain = 'monad' WHERE chain IS NULL;