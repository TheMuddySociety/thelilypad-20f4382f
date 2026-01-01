import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Clock, Music2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';

interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
  duration?: number;
}

interface MusicNFTCardProps {
  collection: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    creator_address: string;
    total_supply: number;
    minted: number;
    phases: any[];
  };
  tracks: MusicTrack[];
  category: 'singles' | 'one_of_one' | 'editions' | 'albums';
  onClick?: () => void;
}

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const categoryLabels: Record<string, { label: string; color: string }> = {
  singles: { label: 'Single', color: 'bg-blue-500/20 text-blue-400' },
  one_of_one: { label: '1/1', color: 'bg-purple-500/20 text-purple-400' },
  editions: { label: 'Edition', color: 'bg-green-500/20 text-green-400' },
  albums: { label: 'Album', color: 'bg-orange-500/20 text-orange-400' },
};

export const MusicNFTCard: React.FC<MusicNFTCardProps> = ({
  collection,
  tracks,
  category,
  onClick,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, setQueue } = useAudioPlayer();
  const [isHovered, setIsHovered] = useState(false);

  const firstTrack = tracks[0];
  const isCurrentlyPlaying = currentTrack?.id === firstTrack?.id && isPlaying;
  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!firstTrack) return;

    if (currentTrack?.id === firstTrack.id) {
      togglePlay();
    } else {
      const queueTracks = tracks.map(t => ({
        ...t,
        collectionId: collection.id,
      }));
      setQueue(queueTracks, 0);
    }
  };

  const getPrice = () => {
    const phase = collection.phases?.[0];
    if (phase?.price) return `${phase.price} MON`;
    return 'Free';
  };

  const { label, color } = categoryLabels[category] || categoryLabels.singles;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        className="overflow-hidden cursor-pointer bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all"
        onClick={onClick}
      >
        <div className="relative aspect-square">
          {collection.image_url ? (
            <img
              src={collection.image_url}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Music2 className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {/* Play button overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered || isCurrentlyPlaying ? 1 : 0 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center"
          >
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90"
              onClick={handlePlayClick}
            >
              {isCurrentlyPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </Button>
          </motion.div>

          {/* Category badge */}
          <Badge className={`absolute top-2 left-2 ${color}`}>
            {label}
          </Badge>

          {/* Track count for albums */}
          {category === 'albums' && tracks.length > 1 && (
            <Badge variant="secondary" className="absolute top-2 right-2">
              {tracks.length} tracks
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold truncate">{collection.name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {firstTrack?.artist || collection.creator_address.slice(0, 6) + '...'}
          </p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(totalDuration)}</span>
            </div>
            <span className="text-sm font-medium text-primary">{getPrice()}</span>
          </div>

          {/* Supply info */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{collection.minted} / {collection.total_supply} minted</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
