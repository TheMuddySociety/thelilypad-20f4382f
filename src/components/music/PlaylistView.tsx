import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, MoreVertical, Trash2, Music2, Clock, Grip, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { toast } from 'sonner';
import { PlaylistModal } from './PlaylistModal';

interface PlaylistTrack {
  id: string;
  track_id: string;
  position: number;
  collection: {
    id: string;
    name: string;
    image_url?: string;
  };
  audio?: {
    audio_url: string;
    cover_art_url: string;
    artist?: string;
    duration_seconds?: number;
  };
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  is_public: boolean;
  created_at: string;
}

interface PlaylistViewProps {
  playlist: Playlist;
  onUpdate?: () => void;
}

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const PlaylistView: React.FC<PlaylistViewProps> = ({ playlist, onUpdate }) => {
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const { currentTrack, isPlaying, setQueue, togglePlay } = useAudioPlayer();

  useEffect(() => {
    fetchTracks();
  }, [playlist.id]);

  const fetchTracks = async () => {
    setIsLoading(true);
    try {
      const { data: playlistTracks, error } = await supabase
        .from('playlist_tracks')
        .select(`
          id,
          track_id,
          position,
          collection:collections (
            id,
            name,
            image_url
          )
        `)
        .eq('playlist_id', playlist.id)
        .order('position');

      if (error) throw error;

      // Fetch audio metadata for each track
      const tracksWithAudio = await Promise.all(
        (playlistTracks || []).map(async (track: any) => {
          const { data: audioData } = await supabase
            .from('collection_audio_metadata')
            .select('audio_url, cover_art_url, artist, duration_seconds')
            .eq('collection_id', track.collection.id)
            .eq('artwork_id', track.track_id)
            .single();

          return {
            ...track,
            audio: audioData,
          };
        })
      );

      setTracks(tracksWithAudio);
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAll = () => {
    const queueTracks = tracks
      .filter(t => t.audio)
      .map(t => ({
        id: t.track_id,
        name: t.collection.name,
        artist: t.audio?.artist || 'Unknown Artist',
        audioUrl: t.audio!.audio_url,
        coverUrl: t.audio!.cover_art_url || t.collection.image_url || '',
        collectionId: t.collection.id,
        duration: t.audio?.duration_seconds,
      }));

    if (queueTracks.length > 0) {
      setQueue(queueTracks, 0);
    }
  };

  const handlePlayTrack = (track: PlaylistTrack, index: number) => {
    if (!track.audio) return;

    const queueTracks = tracks
      .filter(t => t.audio)
      .map(t => ({
        id: t.track_id,
        name: t.collection.name,
        artist: t.audio?.artist || 'Unknown Artist',
        audioUrl: t.audio!.audio_url,
        coverUrl: t.audio!.cover_art_url || t.collection.image_url || '',
        collectionId: t.collection.id,
        duration: t.audio?.duration_seconds,
      }));

    const adjustedIndex = tracks.slice(0, index).filter(t => t.audio).length;
    setQueue(queueTracks, adjustedIndex);
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      setTracks(prev => prev.filter(t => t.id !== trackId));
      toast.success('Track removed from playlist');
    } catch (error: any) {
      toast.error('Failed to remove track');
    }
  };

  const totalDuration = tracks.reduce(
    (acc, t) => acc + (t.audio?.duration_seconds || 0),
    0
  );

  const coverImage = playlist.cover_image_url || tracks[0]?.audio?.cover_art_url || tracks[0]?.collection.image_url;

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex-row items-start gap-4 space-y-0">
          {/* Playlist Cover */}
          <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {coverImage ? (
              <img
                src={coverImage}
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music2 className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-xl">{playlist.name}</CardTitle>
                {playlist.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {playlist.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEditModal(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <span>{tracks.length} tracks</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(totalDuration)}
              </span>
            </div>

            <Button
              className="mt-4"
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              Play All
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Music2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No tracks in this playlist yet</p>
              <p className="text-sm">Add tracks from the Music Store</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tracks.map((track, index) => {
                const isCurrentlyPlaying = currentTrack?.id === track.track_id;

                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isCurrentlyPlaying
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handlePlayTrack(track, index)}
                  >
                    <span className="text-sm text-muted-foreground w-6 text-center">
                      {isCurrentlyPlaying && isPlaying ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          ♪
                        </motion.div>
                      ) : (
                        index + 1
                      )}
                    </span>

                    <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                      {track.audio?.cover_art_url || track.collection.image_url ? (
                        <img
                          src={track.audio?.cover_art_url || track.collection.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {track.collection.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.audio?.artist || 'Unknown Artist'}
                      </p>
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {formatDuration(track.audio?.duration_seconds)}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTrack(track.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove from playlist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PlaylistModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        playlist={playlist}
        onSuccess={() => {
          onUpdate?.();
          fetchTracks();
        }}
      />
    </>
  );
};
