-- Fix collections RLS policies for all chains
-- The previous wallet_owns_profile() check blocked inserts when
-- the anonymous auth user had no matching user_profiles row.
-- This replaces all collection policies with permissive ones.
-- 1. Drop ALL known restrictive policies
DROP POLICY IF EXISTS "Creators can insert their own collections" ON public.collections;
DROP POLICY IF EXISTS "Creators can update their own collections" ON public.collections;
DROP POLICY IF EXISTS "Creators can delete their own collections" ON public.collections;
DROP POLICY IF EXISTS "Anyone can insert collections" ON public.collections;
DROP POLICY IF EXISTS "Anyone can update collections" ON public.collections;
DROP POLICY IF EXISTS "Anyone can delete collections" ON public.collections;
DROP POLICY IF EXISTS "Anyone can view collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can manage all collections" ON public.collections;
-- 2. Ensure RLS is enabled
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
-- 3. Create permissive policies
-- SELECT: anyone can view
CREATE POLICY "collections_select_all" ON public.collections FOR
SELECT USING (true);
-- INSERT: any authenticated user (including anonymous sessions)
CREATE POLICY "collections_insert_authenticated" ON public.collections FOR
INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- UPDATE: creator can update their own (by auth uid)
CREATE POLICY "collections_update_creator" ON public.collections FOR
UPDATE USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
-- DELETE: creator can delete their own (by auth uid)
CREATE POLICY "collections_delete_creator" ON public.collections FOR DELETE USING (auth.uid() = creator_id);