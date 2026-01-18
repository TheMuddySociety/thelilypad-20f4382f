
-- Fix RLS policy on shop_item_contents to only show file_url to purchasers
-- First, drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view contents of active items" ON public.shop_item_contents;

-- Create new policy: Only users who purchased the item can see the contents
CREATE POLICY "Purchasers can view contents of their purchased items"
ON public.shop_item_contents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shop_purchases
    WHERE shop_purchases.item_id = shop_item_contents.item_id
    AND shop_purchases.user_id = auth.uid()
  )
);

-- Creators can still view their own item contents (already exists, keeping it)
-- Admins can still manage all (already exists, keeping it)
