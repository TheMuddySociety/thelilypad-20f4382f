-- Add artworks_metadata column to collections table for 1-of-1 and editions collections
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS artworks_metadata jsonb DEFAULT NULL;