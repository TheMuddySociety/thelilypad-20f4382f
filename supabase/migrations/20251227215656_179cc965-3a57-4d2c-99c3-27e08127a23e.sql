-- Add banner_url column to collections table
ALTER TABLE public.collections 
ADD COLUMN banner_url TEXT;