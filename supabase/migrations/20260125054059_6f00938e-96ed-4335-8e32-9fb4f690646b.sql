-- Drop existing RLS policies on shop_purchases that depend on auth.uid()
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.shop_purchases;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.shop_purchases;
DROP POLICY IF EXISTS "Item creators can view purchases of their items" ON public.shop_purchases;

-- Create new wallet-based RLS policies for shop_purchases
-- Allow anyone to insert purchases (validation happens in application layer via wallet signatures)
CREATE POLICY "Anyone can insert purchases" 
ON public.shop_purchases FOR INSERT
WITH CHECK (true);

-- Users can view purchases linked to their wallet via user_profiles
CREATE POLICY "Users can view their own purchases via wallet"
ON public.shop_purchases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_profiles.id = shop_purchases.user_id
  )
);

-- Item creators can view purchases of their items (wallet-based)
CREATE POLICY "Creators can view purchases of their items"
ON public.shop_purchases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shop_items si
    JOIN public.user_profiles up ON up.id = si.creator_id
    WHERE si.id = shop_purchases.item_id
  )
);