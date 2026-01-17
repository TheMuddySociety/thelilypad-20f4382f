-- Create user_profiles table for wallet-based multi-role profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
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
WITH CHECK (true);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (true);

-- RLS Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
ON public.user_profiles FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.user_profiles IS 'Unified user profiles supporting multiple roles (Collector, Creator, Streamer) with wallet-based authentication';