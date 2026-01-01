import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  track_count?: number;
}

export const useUserPlaylists = (userId?: string) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlaylists = useCallback(async () => {
    if (!userId) {
      setPlaylists([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_playlists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch track counts for each playlist
      const playlistsWithCounts = await Promise.all(
        (data || []).map(async (playlist) => {
          const { count } = await supabase
            .from('playlist_tracks')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', playlist.id);

          return {
            ...playlist,
            track_count: count || 0,
          };
        })
      );

      setPlaylists(playlistsWithCounts);
    } catch (error: any) {
      console.error('Error fetching playlists:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const deletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('user_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      toast.success('Playlist deleted');
    } catch (error: any) {
      toast.error('Failed to delete playlist');
    }
  };

  const addTrackToPlaylist = async (
    playlistId: string,
    collectionId: string,
    trackId: string
  ) => {
    try {
      // Get current max position
      const { data: existing } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { error } = await supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: playlistId,
          collection_id: collectionId,
          track_id: trackId,
          position: nextPosition,
        });

      if (error) throw error;

      toast.success('Track added to playlist');
      fetchPlaylists(); // Refresh to update counts
    } catch (error: any) {
      toast.error('Failed to add track to playlist');
    }
  };

  return {
    playlists,
    isLoading,
    refetch: fetchPlaylists,
    deletePlaylist,
    addTrackToPlaylist,
  };
};
