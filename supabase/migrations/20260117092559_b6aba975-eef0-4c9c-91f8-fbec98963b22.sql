-- Create a security definer function to get profile ID by wallet address
-- This allows RLS policies to work with wallet-based authentication
CREATE OR REPLACE FUNCTION public.get_profile_id_by_wallet(wallet_addr text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.user_profiles WHERE wallet_address = wallet_addr LIMIT 1
$$;

-- Create a function to verify if a wallet owns a specific profile
CREATE OR REPLACE FUNCTION public.wallet_owns_profile(profile_uuid uuid, wallet_addr text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = profile_uuid 
    AND wallet_address = wallet_addr
  )
$$;

-- Drop existing policies on collections
DROP POLICY IF EXISTS "Creators can insert their own collections" ON public.collections;
DROP POLICY IF EXISTS "Creators can update their own collections" ON public.collections;
DROP POLICY IF EXISTS "Creators can delete their own collections" ON public.collections;

-- Create new wallet-aware policies for collections
-- INSERT: Allow if creator_id matches a profile owned by creator_address
CREATE POLICY "Creators can insert their own collections"
ON public.collections
FOR INSERT
WITH CHECK (
  public.wallet_owns_profile(creator_id, creator_address)
);

-- UPDATE: Allow if creator_id matches profile AND creator_address matches
CREATE POLICY "Creators can update their own collections"
ON public.collections
FOR UPDATE
USING (
  public.wallet_owns_profile(creator_id, creator_address)
);

-- DELETE: Allow if creator_id matches profile AND creator_address matches
CREATE POLICY "Creators can delete their own collections"
ON public.collections
FOR DELETE
USING (
  public.wallet_owns_profile(creator_id, creator_address)
);