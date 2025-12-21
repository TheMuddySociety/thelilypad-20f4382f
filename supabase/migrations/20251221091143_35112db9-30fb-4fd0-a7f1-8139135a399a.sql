-- Create streamer_profiles table
CREATE TABLE public.streamer_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  social_twitter TEXT,
  social_youtube TEXT,
  social_discord TEXT,
  social_instagram TEXT,
  social_tiktok TEXT,
  schedule JSONB DEFAULT '[]'::jsonb,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.streamer_profiles ENABLE ROW LEVEL SECURITY;

-- Public can view all streamer profiles
CREATE POLICY "Anyone can view streamer profiles"
ON public.streamer_profiles
FOR SELECT
USING (true);

-- Users can create their own profile
CREATE POLICY "Users can create their own profile"
ON public.streamer_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.streamer_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
ON public.streamer_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_streamer_profiles_updated_at
BEFORE UPDATE ON public.streamer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();