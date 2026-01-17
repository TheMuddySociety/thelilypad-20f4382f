-- Complete the streamer_profiles security fix
-- The view and function were already created, now just need to add the delete policy

-- Drop the insert policy that might already exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.streamer_profiles;

-- Recreate it for consistency
CREATE POLICY "Users can insert their own profile"
ON public.streamer_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Drop and recreate delete policy
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.streamer_profiles;

CREATE POLICY "Users can delete their own profile"
ON public.streamer_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);