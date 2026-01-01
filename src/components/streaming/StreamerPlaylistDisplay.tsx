import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, Play, ListMusic } from 'lucide-react';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';

interface PlaylistTrack {
  id: string;
  name: string;
  artist: string | null;
  audio_url: string;
  cover_art_url: string;
  collection_id: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  tracks: PlaylistTrack[];
}

interface StreamerPlaylistDisplayProps {
  playlistIds: string[];
}

export const StreamerPlaylistDisplay = ({ playlistIds }: StreamerPlaylistDisplayProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setQueue, currentTrack, isPlaying } = useAudioPlayer();

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!playlistIds || playlistIds.length === 0) {
        setPlaylists([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch playlists
        const { data: playlistsData, error: playlistsError } = await supabase
          .from('user_playlists')
          .select('id, name, description, cover_image_url')
          .in('id', playlistIds);

        if (playlistsError) throw playlistsError;

        // Fetch tracks for each playlist
        const playlistsWithTracks = await Promise.all(
          (playlistsData || []).map(async (playlist) => {
            const { data: tracksData } = await supabase
              .from('playlist_tracks')
              .select(`
                id,
                collection_id,
                track_id,
                position,
                collection_audio_metadata!inner(
                  id,
                  audio_url,
                  cover_art_url,
                  artist
                )
              `)
              .eq('playlist_id', playlist.id)
              .order('position', { ascending: true })
              .limit(5);

            // Also get collection names
            const collectionIds = tracksData?.map(t => t.collection_id) || [];
            const { data: collectionsData } = await supabase
              .from('collections')
              .select('id, name')
              .in('id', collectionIds);

            const tracks: PlaylistTrack[] = (tracksData || []).map(track => {
              const audioMeta = Array.isArray(track.collection_audio_metadata)
                ? track.collection_audio_metadata[0]
                : track.collection_audio_metadata;
              const collection = collectionsData?.find(c => c.id === track.collection_id);
              
              return {
                id: track.id,
                name: collection?.name || 'Unknown Track',
                artist: audioMeta?.artist || null,
                audio_url: audioMeta?.audio_url || '',
                cover_art_url: audioMeta?.cover_art_url || '',
                collection_id: track.collection_id,
              };
            });

            return {
              ...playlist,
              tracks,
            };
          })
        );

        setPlaylists(playlistsWithTracks);
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, [playlistIds]);

  const handlePlayPlaylist = (playlist: Playlist) => {
    const queue = playlist.tracks.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artist || 'Unknown Artist',
      audioUrl: track.audio_url,
      coverUrl: track.cover_art_url,
      collectionId: track.collection_id,
    }));
    setQueue(queue);
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Listening To
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (playlists.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Listening To
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {playlists.map(playlist => (
          <div
            key={playlist.id}
            className="group relative p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {playlist.cover_image_url ? (
                  <img
                    src={playlist.cover_image_url}
                    alt={playlist.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                    <ListMusic className="h-8 w-8 text-primary" />
                  </div>
                )}
                {playlist.tracks.length > 0 && (
                  <button
                    onClick={() => handlePlayPlaylist(playlist)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Play className="h-6 w-6 text-white fill-white" />
                  </button>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{playlist.name}</h4>
                {playlist.description && (
                  <p className="text-sm text-muted-foreground truncate mb-2">
                    {playlist.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {playlist.tracks.length} track{playlist.tracks.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            {/* Track previews */}
            {playlist.tracks.length > 0 && (
              <div className="mt-3 space-y-1">
                {playlist.tracks.slice(0, 3).map((track, idx) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="w-4 text-right opacity-50">{idx + 1}</span>
                    <span className="truncate">{track.name}</span>
                    {track.artist && (
                      <span className="opacity-50 truncate">• {track.artist}</span>
                    )}
                  </div>
                ))}
                {playlist.tracks.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-6">
                    +{playlist.tracks.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
