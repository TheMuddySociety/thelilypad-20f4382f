-- Hardening user_profiles RLS Policies
-- This migration replaces overly permissive 'true' policies with strict ownership checks.
-- 1. Drop existing insecure policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
-- 2. Implement secure policies
-- INSERT: Only if the user_id matches the authenticated user
-- Note: This requires the application to pass the correct user_id during insertion.
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- UPDATE: Must own the profile via user_id OR wallet_address in JWT claims
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR
UPDATE USING (
        auth.uid() = user_id
        OR wallet_address = (
            current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );
-- DELETE: Must own the profile via user_id OR wallet_address in JWT claims
CREATE POLICY "Users can delete own profile" ON public.user_profiles FOR DELETE USING (
    auth.uid() = user_id
    OR wallet_address = (
        current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
);
-- Ensure SELECT remains public (Anyone can view profiles)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'user_profiles'
        AND policyname = 'Anyone can view user profiles'
) THEN CREATE POLICY "Anyone can view user profiles" ON public.user_profiles FOR
SELECT USING (true);
END IF;
END $$;
COMMENT ON POLICY "Users can insert own profile" ON public.user_profiles IS 'Enforces that users can only create profiles linked to their own auth.uid()';
COMMENT ON POLICY "Users can update own profile" ON public.user_profiles IS 'Enforces that users can only update profiles they own via user_id or wallet JWT claim';
COMMENT ON POLICY "Users can delete own profile" ON public.user_profiles IS 'Enforces that users can only delete profiles they own via user_id or wallet JWT claim';