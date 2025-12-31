-- Add limited-time fields to shop_bundles
ALTER TABLE public.shop_bundles
ADD COLUMN IF NOT EXISTS is_limited_time boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS starts_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Create index for efficient querying of active limited-time bundles
CREATE INDEX IF NOT EXISTS idx_shop_bundles_limited_time 
ON public.shop_bundles (is_limited_time, starts_at, expires_at) 
WHERE is_limited_time = true;