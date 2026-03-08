
-- =============================================
-- FIX 1: user_profiles - replace bare true with auth.uid() checks
-- =============================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;

-- Recreate with proper auth checks
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON public.user_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- FIX 2: shop_purchases - fix SELECT and INSERT policies
-- =============================================

DROP POLICY IF EXISTS "Anyone can insert purchases" ON public.shop_purchases;
DROP POLICY IF EXISTS "Users can view their own purchases via wallet" ON public.shop_purchases;
DROP POLICY IF EXISTS "Creators can view purchases of their items" ON public.shop_purchases;

CREATE POLICY "Authenticated users can insert their own purchases" ON public.shop_purchases
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own purchases" ON public.shop_purchases
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Creators can view purchases of their items" ON public.shop_purchases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_items si
      WHERE si.id = shop_purchases.item_id
        AND si.creator_id = auth.uid()
    )
  );

-- =============================================
-- FIX 3: card_stack_items - remove anon write policies
-- =============================================

DROP POLICY IF EXISTS "Anon can insert cards" ON public.card_stack_items;
DROP POLICY IF EXISTS "Anon can update cards" ON public.card_stack_items;
DROP POLICY IF EXISTS "Anon can delete cards" ON public.card_stack_items;

-- Replace generic management policies with admin-only
DROP POLICY IF EXISTS "Allow insert for management" ON public.card_stack_items;
DROP POLICY IF EXISTS "Allow update for management" ON public.card_stack_items;
DROP POLICY IF EXISTS "Allow delete for management" ON public.card_stack_items;

CREATE POLICY "Admins can insert cards" ON public.card_stack_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cards" ON public.card_stack_items
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cards" ON public.card_stack_items
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- FIX 4: nft_mints - restrict INSERT to authenticated
-- =============================================

DROP POLICY IF EXISTS "Users can record their own mints" ON public.nft_mints;

CREATE POLICY "Authenticated users can record mints" ON public.nft_mints
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- FIX 5: update_updated_at_column - set search_path
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
