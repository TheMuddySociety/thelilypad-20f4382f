-- Admin RLS Power Restoration
-- This migration ensures that users with the 'admin' role in public.user_roles 
-- can manage all critical tables in the system.
-- 1. Collections (Fixing the issue where nuclear_rls_fix removed admin access)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'collections'
        AND policyname = 'Admins can manage all collections'
) THEN CREATE POLICY "Admins can manage all collections" ON public.collections FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
END IF;
END $$;
-- 2. Featured Collections
DROP POLICY IF EXISTS "Admins can manage featured collections" ON public.featured_collections;
CREATE POLICY "Admins can manage featured collections" ON public.featured_collections FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- 3. Card Stack Items
DROP POLICY IF EXISTS "Admins can manage card stack items" ON public.card_stack_items;
CREATE POLICY "Admins can manage card stack items" ON public.card_stack_items FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- 4. Shop Items & Bundles
DROP POLICY IF EXISTS "Admins can manage all shop items" ON public.shop_items;
CREATE POLICY "Admins can manage all shop items" ON public.shop_items FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage all bundles" ON public.shop_bundles;
CREATE POLICY "Admins can manage all bundles" ON public.shop_bundles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- 5. Raffles & Blind Boxes
DROP POLICY IF EXISTS "Admins can manage all raffles" ON public.lily_raffles;
CREATE POLICY "Admins can manage all raffles" ON public.lily_raffles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage all blind boxes" ON public.lily_blind_boxes;
CREATE POLICY "Admins can manage all blind boxes" ON public.lily_blind_boxes FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- 6. User Profiles (Admins should be able to update roles/status)
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- 7. Ensure user_roles itself is manageable by admins
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Grant full access to schemas just in case
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;