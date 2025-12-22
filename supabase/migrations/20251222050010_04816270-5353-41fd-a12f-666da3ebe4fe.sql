-- Create clip_reactions table
CREATE TABLE public.clip_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id uuid REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(clip_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.clip_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "Anyone can view clip reactions"
ON public.clip_reactions
FOR SELECT
USING (true);

-- Authenticated users can add reactions
CREATE POLICY "Authenticated users can add reactions"
ON public.clip_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON public.clip_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.clip_reactions;