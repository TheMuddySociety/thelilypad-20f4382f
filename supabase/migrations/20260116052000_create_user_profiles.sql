-- Create user_profiles table for wallet-based multi-role profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for wallet-only users
  
  -- Profile type flags
  is_collector BOOLEAN DEFAULT false,
  is_creator BOOLEAN DEFAULT false,
  is_streamer BOOLEAN DEFAULT false,
  
  -- Profile setup status
  profile_setup_completed BOOLEAN DEFAULT false,
  
  -- Basic info
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  
  -- Social links
  social_twitter TEXT,
  social_discord TEXT,
  social_instagram TEXT,
  social_youtube TEXT,
  social_tiktok TEXT,
  
  -- Streamer-specific fields
  schedule JSONB DEFAULT '[]'::jsonb,
  categories TEXT[],
  payout_wallet_address TEXT,
  playlist_ids TEXT[],
  is_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet ON public.user_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view profiles
CREATE POLICY "Anyone can view user profiles"
ON public.user_profiles FOR SELECT
USING (true);

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (true); -- Will validate on application layer

-- RLS Policy: Users can update their own profile (by wallet or user_id)
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (
  wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
  OR user_id = auth.uid()
);

-- RLS Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
ON public.user_profiles FOR DELETE
USING (
  wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
  OR user_id = auth.uid()
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing streamer_profiles to user_profiles
INSERT INTO public.user_profiles (
  wallet_address,
  user_id,
  is_streamer,
  profile_setup_completed,
  display_name,
  bio,
  avatar_url,
  banner_url,
  social_twitter,
  social_discord,
  social_instagram,
  social_youtube,
  social_tiktok,
  schedule,
  categories,
  payout_wallet_address,
  playlist_ids,
  is_verified,
  created_at,
  updated_at
)
SELECT 
  COALESCE(sol_wallet_address, 'legacy-' || user_id::text) as wallet_address,
  user_id,
  true as is_streamer,
  true as profile_setup_completed,
  display_name,
  bio,
  avatar_url,
  banner_url,
  social_twitter,
  social_discord,
  social_instagram,
  social_youtube,
  social_tiktok,
  schedule,
  categories,
  payout_wallet_address,
  playlist_ids,
  is_verified,
  created_at,
  updated_at
FROM public.streamer_profiles
ON CONFLICT (wallet_address) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE public.user_profiles IS 'Unified user profiles supporting multiple roles (Collector, Creator, Streamer) with wallet-based authentication';
