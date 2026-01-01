import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, ListMusic } from 'lucide-react';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
}

interface StreamerPlaylistSelectorProps {
  userId: string;
  selectedPlaylistIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const StreamerPlaylistSelector = ({
  userId,
  selectedPlaylistIds,
  onSelectionChange,
}: StreamerPlaylistSelectorProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!userId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_playlists')
          .select('id, name, description, cover_image_url, is_public')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPlaylists(data || []);
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, [userId]);

  const togglePlaylist = (playlistId: string) => {
    if (selectedPlaylistIds.includes(playlistId)) {
      onSelectionChange(selectedPlaylistIds.filter(id => id !== playlistId));
    } else {
      onSelectionChange([...selectedPlaylistIds, playlistId]);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Music Playlists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (playlists.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Music Playlists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ListMusic className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No playlists yet</p>
            <p className="text-sm mt-1">
              Create playlists in the Music Store to showcase here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Music Playlists
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select playlists to showcase on your profile
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {playlists.map(playlist => (
          <div
            key={playlist.id}
            className={`flex items-center gap-4 p-3 rounded-lg border transition-colors cursor-pointer ${
              selectedPlaylistIds.includes(playlist.id)
                ? 'border-primary bg-primary/10'
                : 'border-border/50 hover:border-primary/50'
            }`}
            onClick={() => togglePlaylist(playlist.id)}
          >
            <Checkbox
              checked={selectedPlaylistIds.includes(playlist.id)}
              onCheckedChange={() => togglePlaylist(playlist.id)}
            />
            <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
              {playlist.cover_image_url ? (
                <img
                  src={playlist.cover_image_url}
                  alt={playlist.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Music className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{playlist.name}</p>
              {playlist.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {playlist.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
