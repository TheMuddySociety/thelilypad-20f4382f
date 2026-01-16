-- Create a public view for streamer profiles that excludes sensitive wallet addresses
CREATE VIEW public.streamer_profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  display_name,
  bio,
  avatar_url,
  banner_url,
  social_twitter,
  social_youtube,
  social_discord,
  social_instagram,
  social_tiktok,
  categories,
  is_verified,
  schedule,
  playlist_ids,
  preferred_currency,
  created_at,
  updated_at
FROM public.streamer_profiles;

-- Grant access to the view for all roles
GRANT SELECT ON public.streamer_profiles_public TO anon, authenticated;

-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view streamer profiles" ON public.streamer_profiles;

-- Create new policy: owners can see their own full profile (including wallet addresses)
CREATE POLICY "Users can view their own full profile"
ON public.streamer_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Note: Admins already have full access via "Admins can manage all streamer profiles" policy