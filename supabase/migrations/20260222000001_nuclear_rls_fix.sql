-- NUCLEAR FIX: Drop ALL collections policies and reset RLS correctly
-- This script uses a DO block to find and drop EVERY policy on the collections table.
-- Then it creates clean, permissive policies that work for wallet-only/anonymous users.
DO $$
DECLARE pol RECORD;
BEGIN FOR pol IN
SELECT policyname
FROM pg_policies
WHERE tablename = 'collections'
    AND schemaname = 'public' LOOP EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.collections',
        pol.policyname
    );
END LOOP;
END $$;
-- 2. Ensure RLS is enabled
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
-- 3. Create fresh, permissive policies
-- SELECT: anyone can view
CREATE POLICY "collections_select_all" ON public.collections FOR
SELECT USING (true);
-- INSERT: any authenticated user (including anonymous sessions)
CREATE POLICY "collections_insert_authenticated" ON public.collections FOR
INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- UPDATE: creator can update their own (by matching auth uid)
CREATE POLICY "collections_update_creator" ON public.collections FOR
UPDATE USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
-- DELETE: creator can delete their own
CREATE POLICY "collections_delete_creator" ON public.collections FOR DELETE USING (auth.uid() = creator_id);
-- 4. GRANT access to various roles just in case
GRANT ALL ON TABLE public.collections TO postgres,
    service_role,
    anon,
    authenticated;