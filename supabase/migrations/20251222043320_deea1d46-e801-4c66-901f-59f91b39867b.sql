-- Create table for stream clips/highlights
CREATE TABLE public.clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  clip_url TEXT,
  start_time_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 30,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- Anyone can view clips (public content)
CREATE POLICY "Anyone can view clips"
ON public.clips
FOR SELECT
USING (true);

-- Users can create their own clips
CREATE POLICY "Users can create their own clips"
ON public.clips
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own clips
CREATE POLICY "Users can update their own clips"
ON public.clips
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own clips
CREATE POLICY "Users can delete their own clips"
ON public.clips
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_clips_user_id ON public.clips(user_id);
CREATE INDEX idx_clips_stream_id ON public.clips(stream_id);