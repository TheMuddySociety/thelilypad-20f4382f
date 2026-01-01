import React, { useState, useEffect } from 'react';
import { Music2, Upload, Globe, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  is_public: boolean;
}

interface PlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist?: Playlist | null;
  onSuccess?: () => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  open,
  onOpenChange,
  playlist,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!playlist;

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || '');
      setIsPublic(playlist.is_public);
      setCoverUrl(playlist.cover_image_url || '');
    } else {
      setName('');
      setDescription('');
      setIsPublic(false);
      setCoverUrl('');
    }
  }, [playlist, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to create a playlist');
        return;
      }

      if (isEditing && playlist) {
        const { error } = await supabase
          .from('user_playlists')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            is_public: isPublic,
            cover_image_url: coverUrl.trim() || null,
          })
          .eq('id', playlist.id);

        if (error) throw error;
        toast.success('Playlist updated!');
      } else {
        const { error } = await supabase
          .from('user_playlists')
          .insert({
            user_id: user.id,
            name: name.trim(),
            description: description.trim() || null,
            is_public: isPublic,
            cover_image_url: coverUrl.trim() || null,
          });

        if (error) throw error;
        toast.success('Playlist created!');
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save playlist');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Playlist' : 'Create Playlist'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            {/* Cover Preview */}
            <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Playlist cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My Playlist"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="cover">Cover URL (optional)</Label>
                <Input
                  id="cover"
                  placeholder="https://..."
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this playlist about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isPublic ? 'Public' : 'Private'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? 'Anyone can view this playlist'
                    : 'Only you can view this playlist'}
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Saving...'
                : isEditing
                ? 'Save Changes'
                : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
