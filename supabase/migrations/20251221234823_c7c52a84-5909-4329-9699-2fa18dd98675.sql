-- Add categories column to streamer_profiles
ALTER TABLE public.streamer_profiles 
ADD COLUMN categories text[] DEFAULT '{}'::text[];