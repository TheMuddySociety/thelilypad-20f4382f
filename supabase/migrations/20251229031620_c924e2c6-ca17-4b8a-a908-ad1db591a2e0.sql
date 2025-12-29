-- Add scheduled reveal columns to collections
ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS scheduled_reveal_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient querying of scheduled reveals
CREATE INDEX IF NOT EXISTS idx_collections_scheduled_reveal 
ON public.collections (scheduled_reveal_at) 
WHERE scheduled_reveal_at IS NOT NULL AND is_revealed = false;