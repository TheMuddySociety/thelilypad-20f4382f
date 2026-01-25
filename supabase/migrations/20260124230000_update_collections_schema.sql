-- Update collections table schema to match frontend requirements
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS collection_type TEXT,
ADD COLUMN IF NOT EXISTS chain TEXT,
ADD COLUMN IF NOT EXISTS social_twitter TEXT,
ADD COLUMN IF NOT EXISTS social_discord TEXT,
ADD COLUMN IF NOT EXISTS social_website TEXT,
ADD COLUMN IF NOT EXISTS social_telegram TEXT,
ADD COLUMN IF NOT EXISTS treasury_wallet TEXT;

-- Update RLS policies for collections to support wallet-only users
-- Drop existing policies that depend on auth.uid()
DROP POLICY IF EXISTS "Creators can insert their own collections" ON public.collections;
DROP POLICY IF EXISTS "Creators can update their own collections" ON public.collections;
DROP POLICY IF EXISTS "Creators can delete their own collections" ON public.collections;

-- Allow anyone to insert collections (validation happens in application layer)
CREATE POLICY "Anyone can insert collections"
ON public.collections FOR INSERT
WITH CHECK (true);

-- Allow updates for anyone for now (development flexibility for wallet-only flow)
-- In production, this should be restricted based on wallet ownership
CREATE POLICY "Anyone can update collections"
ON public.collections FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow deletion for anyone for now
CREATE POLICY "Anyone can delete collections"
ON public.collections FOR DELETE
USING (true);

-- Add comment to document the changes
COMMENT ON COLUMN public.collections.treasury_wallet IS 'Solana wallet address for receiving mint proceeds';
