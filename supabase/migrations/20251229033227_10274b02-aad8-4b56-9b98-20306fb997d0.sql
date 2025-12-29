-- Add claim tracking to earnings table
ALTER TABLE public.earnings 
ADD COLUMN IF NOT EXISTS is_claimed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone;

-- Add claim tracking to nft_listings for seller earnings
ALTER TABLE public.nft_listings 
ADD COLUMN IF NOT EXISTS seller_claimed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_claimed_at timestamp with time zone;

-- Add claim tracking to shop_purchases for creator earnings
ALTER TABLE public.shop_purchases 
ADD COLUMN IF NOT EXISTS creator_claimed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS creator_claimed_at timestamp with time zone;

-- Create index for efficient unclaimed earnings queries
CREATE INDEX IF NOT EXISTS idx_earnings_unclaimed ON public.earnings(user_id, is_claimed) WHERE is_claimed = false;
CREATE INDEX IF NOT EXISTS idx_nft_listings_unclaimed ON public.nft_listings(seller_id, seller_claimed) WHERE seller_claimed = false AND status = 'sold';
CREATE INDEX IF NOT EXISTS idx_shop_purchases_unclaimed ON public.shop_purchases(item_id, creator_claimed) WHERE creator_claimed = false;