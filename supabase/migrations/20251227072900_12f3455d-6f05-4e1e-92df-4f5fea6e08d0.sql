-- Add social links columns to collections table
ALTER TABLE public.collections
ADD COLUMN social_twitter TEXT,
ADD COLUMN social_discord TEXT,
ADD COLUMN social_website TEXT,
ADD COLUMN social_telegram TEXT;