-- Add playlist_ids column to streamer_profiles for music playlists
ALTER TABLE public.streamer_profiles
ADD COLUMN playlist_ids uuid[] DEFAULT '{}';

-- Add a comment explaining the column
COMMENT ON COLUMN public.streamer_profiles.playlist_ids IS 'Array of user_playlist IDs that the streamer wants to showcase on their profile';