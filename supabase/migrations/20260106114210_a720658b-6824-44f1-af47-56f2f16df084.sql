-- Add preferred currency and SOL wallet to streamer profiles
ALTER TABLE public.streamer_profiles 
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'MON',
ADD COLUMN IF NOT EXISTS sol_wallet_address TEXT;

-- Add currency option to shop items (default to MON for existing items)
ALTER TABLE public.shop_items 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MON';

-- Add currency option to shop bundles
ALTER TABLE public.shop_bundles 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MON';

-- Add price_sol column for SOL pricing
ALTER TABLE public.shop_items 
ADD COLUMN IF NOT EXISTS price_sol NUMERIC DEFAULT 0;

ALTER TABLE public.shop_bundles 
ADD COLUMN IF NOT EXISTS bundle_price_sol NUMERIC DEFAULT 0;

-- Update shop_purchases to track currency
ALTER TABLE public.shop_purchases 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MON';

-- Update shop_bundle_purchases to track currency
ALTER TABLE public.shop_bundle_purchases 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MON';

-- Create index for currency-based queries
CREATE INDEX IF NOT EXISTS idx_shop_items_currency ON public.shop_items(currency);
CREATE INDEX IF NOT EXISTS idx_shop_bundles_currency ON public.shop_bundles(currency);

-- Add constraint to ensure valid currency values
ALTER TABLE public.streamer_profiles 
ADD CONSTRAINT valid_preferred_currency CHECK (preferred_currency IN ('MON', 'SOL'));

ALTER TABLE public.shop_items 
ADD CONSTRAINT valid_shop_item_currency CHECK (currency IN ('MON', 'SOL'));

ALTER TABLE public.shop_bundles 
ADD CONSTRAINT valid_shop_bundle_currency CHECK (currency IN ('MON', 'SOL'));