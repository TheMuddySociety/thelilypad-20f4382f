import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, User, Disc, Hash, Clock, Zap } from 'lucide-react';
import { formatAudioDuration } from '@/hooks/useAudioDuration';
import { AudioPlayer } from './AudioPlayer';

export interface MusicMetadata {
  name: string;
  description: string;
  artist: string;
  album: string;
  trackNumber: number | null;
  genre: string;
  bpm: number | null;
  durationSeconds: number | null;
}

export interface MusicTrack {
  id: string;
  audioFile: File;
  audioPreview: string;
  audioUrl?: string;
  coverFile: File;
  coverPreview: string;
  coverUrl?: string;
  metadata: MusicMetadata;
}

interface MusicMetadataEditorProps {
  track: MusicTrack | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (track: MusicTrack) => void;
}

const GENRES = [
  'Electronic',
  'Hip-Hop',
  'Pop',
  'Rock',
  'R&B',
  'Jazz',
  'Classical',
  'Country',
  'Folk',
  'Indie',
  'Metal',
  'Punk',
  'Reggae',
  'Soul',
  'Techno',
  'House',
  'Ambient',
  'Lo-Fi',
  'Trap',
  'Other',
];

export const MusicMetadataEditor: React.FC<MusicMetadataEditorProps> = ({
  track,
  open,
  onOpenChange,
  onSave,
}) => {
  const [metadata, setMetadata] = useState<MusicMetadata>({
    name: '',
    description: '',
    artist: '',
    album: '',
    trackNumber: null,
    genre: '',
    bpm: null,
    durationSeconds: null,
  });

  useEffect(() => {
    if (track) {
      setMetadata(track.metadata);
    }
  }, [track]);

  const handleSave = () => {
    if (!track) return;
    
    onSave({
      ...track,
      metadata,
    });
    onOpenChange(false);
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Edit Track Metadata
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="flex gap-4 items-start">
            <img
              src={track.coverPreview}
              alt="Cover"
              className="w-24 h-24 rounded-lg object-cover shadow-md"
            />
            <div className="flex-1">
              <AudioPlayer
                src={track.audioPreview}
                coverArt={track.coverPreview}
                title={metadata.name || 'Untitled Track'}
                artist={metadata.artist}
                compact
              />
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Track Name *
              </Label>
              <Input
                id="name"
                value={metadata.name}
                onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
                placeholder="Enter track name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="artist" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Artist *
              </Label>
              <Input
                id="artist"
                value={metadata.artist}
                onChange={(e) => setMetadata({ ...metadata, artist: e.target.value })}
                placeholder="Artist name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="album" className="flex items-center gap-2">
                <Disc className="h-4 w-4" />
                Album
              </Label>
              <Input
                id="album"
                value={metadata.album}
                onChange={(e) => setMetadata({ ...metadata, album: e.target.value })}
                placeholder="Album name (optional)"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              placeholder="Describe this track..."
              rows={3}
            />
          </div>

          {/* Music-specific Fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trackNumber" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Track #
              </Label>
              <Input
                id="trackNumber"
                type="number"
                min={1}
                value={metadata.trackNumber || ''}
                onChange={(e) => setMetadata({ 
                  ...metadata, 
                  trackNumber: e.target.value ? parseInt(e.target.value) : null 
                })}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Select
                value={metadata.genre}
                onValueChange={(value) => setMetadata({ ...metadata, genre: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bpm" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                BPM
              </Label>
              <Input
                id="bpm"
                type="number"
                min={1}
                max={300}
                value={metadata.bpm || ''}
                onChange={(e) => setMetadata({ 
                  ...metadata, 
                  bpm: e.target.value ? parseInt(e.target.value) : null 
                })}
                placeholder="120"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration
              </Label>
              <Input
                id="duration"
                value={metadata.durationSeconds ? formatAudioDuration(metadata.durationSeconds) : '--:--'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!metadata.name || !metadata.artist}>
            Save Metadata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MusicMetadataEditor;
