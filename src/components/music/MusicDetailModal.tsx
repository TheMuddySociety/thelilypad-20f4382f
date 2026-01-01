import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Plus, Share2, ExternalLink, Clock, Music2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { useNavigate } from 'react-router-dom';

interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
  duration?: number;
  genre?: string;
  bpm?: number;
  album?: string;
}

interface MusicDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    creator_address: string;
    total_supply: number;
    minted: number;
    phases: any[];
  } | null;
  tracks: MusicTrack[];
}

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MusicDetailModal: React.FC<MusicDetailModalProps> = ({
  open,
  onOpenChange,
  collection,
  tracks,
}) => {
  const navigate = useNavigate();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playTrack,
    togglePlay,
    seek,
    setQueue,
  } = useAudioPlayer();

  if (!collection) return null;

  const activeTrack = tracks.find(t => t.id === currentTrack?.id) || tracks[0];
  const isCurrentPlaying = currentTrack?.id === activeTrack?.id && isPlaying;

  const handlePlayAll = () => {
    const queueTracks = tracks.map(t => ({
      ...t,
      collectionId: collection.id,
    }));
    setQueue(queueTracks, 0);
  };

  const handlePlayTrack = (track: MusicTrack, index: number) => {
    const queueTracks = tracks.map(t => ({
      ...t,
      collectionId: collection.id,
    }));
    setQueue(queueTracks, index);
  };

  const handleViewCollection = () => {
    onOpenChange(false);
    navigate(`/collection/${collection.id}`);
  };

  const getPrice = () => {
    const phase = collection.phases?.[0];
    if (phase?.price) return `${phase.price} MON`;
    return 'Free';
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">{collection.name}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Cover Art */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden">
              {collection.image_url ? (
                <img
                  src={collection.image_url}
                  alt={collection.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Music2 className="h-24 w-24 text-muted-foreground" />
                </div>
              )}

              {/* Play overlay */}
              <motion.div
                className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer"
                whileHover={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                onClick={() => {
                  if (currentTrack?.id === activeTrack?.id) {
                    togglePlay();
                  } else {
                    handlePlayAll();
                  }
                }}
              >
                <Button size="icon" className="h-16 w-16 rounded-full">
                  {isCurrentPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" />
                  )}
                </Button>
              </motion.div>
            </div>

            {/* Progress bar for current track */}
            {currentTrack && tracks.some(t => t.id === currentTrack.id) && (
              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={([value]) => seek(value)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Info & Tracklist */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{collection.name}</h2>
              <p className="text-muted-foreground">
                {activeTrack?.artist || collection.creator_address.slice(0, 6) + '...'}
              </p>
            </div>

            {collection.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {collection.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {activeTrack?.genre && (
                <Badge variant="secondary">{activeTrack.genre}</Badge>
              )}
              {activeTrack?.bpm && (
                <Badge variant="outline">{activeTrack.bpm} BPM</Badge>
              )}
              <Badge variant="outline">
                {collection.minted}/{collection.total_supply} minted
              </Badge>
            </div>

            {/* Tracklist */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                {tracks.length > 1 ? 'Tracklist' : 'Track'}
              </h3>
              <ScrollArea className="h-[180px]">
                <div className="space-y-1">
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        currentTrack?.id === track.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handlePlayTrack(track, index)}
                    >
                      <span className="text-xs text-muted-foreground w-4">
                        {currentTrack?.id === track.id && isPlaying ? (
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
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{track.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.artist}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button className="flex-1" onClick={handleViewCollection}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {getPrice()} - Mint
              </Button>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
