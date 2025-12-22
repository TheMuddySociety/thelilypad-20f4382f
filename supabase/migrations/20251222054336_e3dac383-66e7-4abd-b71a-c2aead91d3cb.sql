-- Add banner_url column to streamer_profiles table
ALTER TABLE public.streamer_profiles 
ADD COLUMN banner_url text DEFAULT NULL;