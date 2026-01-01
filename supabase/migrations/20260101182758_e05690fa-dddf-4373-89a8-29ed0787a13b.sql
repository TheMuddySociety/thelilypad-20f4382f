-- Create user_playlists table
CREATE TABLE public.user_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create playlist_tracks table
CREATE TABLE public.playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.user_playlists(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  track_id TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_playlists
CREATE POLICY "Users can view their own playlists"
ON public.user_playlists FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public playlists"
ON public.user_playlists FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can create their own playlists"
ON public.user_playlists FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
ON public.user_playlists FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
ON public.user_playlists FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for playlist_tracks
CREATE POLICY "Users can view tracks in their playlists"
ON public.playlist_tracks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_playlists
  WHERE user_playlists.id = playlist_tracks.playlist_id
  AND user_playlists.user_id = auth.uid()
));

CREATE POLICY "Anyone can view tracks in public playlists"
ON public.playlist_tracks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_playlists
  WHERE user_playlists.id = playlist_tracks.playlist_id
  AND user_playlists.is_public = true
));

CREATE POLICY "Users can add tracks to their playlists"
ON public.playlist_tracks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_playlists
  WHERE user_playlists.id = playlist_tracks.playlist_id
  AND user_playlists.user_id = auth.uid()
));

CREATE POLICY "Users can update tracks in their playlists"
ON public.playlist_tracks FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.user_playlists
  WHERE user_playlists.id = playlist_tracks.playlist_id
  AND user_playlists.user_id = auth.uid()
));

CREATE POLICY "Users can remove tracks from their playlists"
ON public.playlist_tracks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.user_playlists
  WHERE user_playlists.id = playlist_tracks.playlist_id
  AND user_playlists.user_id = auth.uid()
));

-- Create updated_at trigger for playlists
CREATE TRIGGER update_user_playlists_updated_at
BEFORE UPDATE ON public.user_playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();