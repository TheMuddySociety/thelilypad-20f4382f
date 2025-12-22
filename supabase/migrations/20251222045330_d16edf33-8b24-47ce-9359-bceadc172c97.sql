-- Create clip_events table to track views, shares, and other engagement
CREATE TABLE public.clip_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id uuid REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
    event_type text NOT NULL, -- 'view', 'share', 'embed_copy'
    platform text, -- 'twitter', 'facebook', 'discord', 'reddit', 'link', 'native'
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    viewer_id uuid -- optional, for authenticated viewers
);

-- Enable RLS
ALTER TABLE public.clip_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (for tracking views/shares)
CREATE POLICY "Anyone can insert clip events"
ON public.clip_events
FOR INSERT
WITH CHECK (true);

-- Clip owners can view their clip analytics
CREATE POLICY "Clip owners can view their clip events"
ON public.clip_events
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.clips 
        WHERE clips.id = clip_events.clip_id 
        AND clips.user_id = auth.uid()
    )
);

-- Enable realtime for clip_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.clip_events;