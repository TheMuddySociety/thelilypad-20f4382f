-- Add collection_type column to collections table
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS collection_type text NOT NULL DEFAULT 'generative';

-- Add comment for documentation
COMMENT ON COLUMN public.collections.collection_type IS 'Type of collection: generative, one_of_one, or editions';