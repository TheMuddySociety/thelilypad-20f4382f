-- Add parent_id column for nested comments
ALTER TABLE public.clip_comments 
ADD COLUMN parent_id uuid REFERENCES public.clip_comments(id) ON DELETE CASCADE;