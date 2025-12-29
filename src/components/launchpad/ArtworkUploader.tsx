import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  X,
  Trash2,
  Image as ImageIcon,
  GripVertical,
  Loader2,
  Plus,
  FileImage,
  Edit2,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ArtworkItem {
  id: string;
  name: string;
  imageUrl: string;
  description?: string;
  file?: File;
  isUploading?: boolean;
}

interface ArtworkUploaderProps {
  artworks: ArtworkItem[];
  onArtworksChange: (artworks: ArtworkItem[]) => void;
  collectionType: "one_of_one" | "editions";
  creatorId: string;
  maxItems?: number;
}

export function ArtworkUploader({
  artworks,
  onArtworksChange,
  collectionType,
  creatorId,
  maxItems = 100
}: ArtworkUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent, isDragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isDragging);
  }, []);

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error("Please upload image files only");
      return;
    }

    if (artworks.length + imageFiles.length > maxItems) {
      toast.error(`Cannot add more than ${maxItems} items`);
      return;
    }

    setIsUploading(true);

    const newArtworks: ArtworkItem[] = [];

    for (const file of imageFiles) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      // Create preview
      const id = `artwork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      
      // Upload to storage
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${creatorId}/artwork/${id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('collection-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('collection-images')
          .getPublicUrl(fileName);

        newArtworks.push({
          id,
          name,
          imageUrl: publicUrl,
          description: ""
        });
      } catch (err) {
        console.error("Error uploading:", err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newArtworks.length > 0) {
      onArtworksChange([...artworks, ...newArtworks]);
      toast.success(`Added ${newArtworks.length} artwork${newArtworks.length > 1 ? 's' : ''}`);
    }

    setIsUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }, [artworks, onArtworksChange, creatorId, maxItems]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeArtwork = async (id: string) => {
    const artwork = artworks.find(a => a.id === id);
    if (artwork?.imageUrl && artwork.imageUrl.includes('collection-images')) {
      // Try to delete from storage
      try {
        const urlParts = artwork.imageUrl.split('/collection-images/');
        if (urlParts[1]) {
          await supabase.storage
            .from('collection-images')
            .remove([urlParts[1]]);
        }
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }
    onArtworksChange(artworks.filter(a => a.id !== id));
  };

  const updateArtwork = (id: string, updates: Partial<ArtworkItem>) => {
    onArtworksChange(artworks.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const moveArtwork = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= artworks.length) return;
    
    const newArtworks = [...artworks];
    [newArtworks[fromIndex], newArtworks[toIndex]] = [newArtworks[toIndex], newArtworks[fromIndex]];
    onArtworksChange(newArtworks);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={(e) => handleDrag(e, true)}
        onDragOver={(e) => handleDrag(e, true)}
        onDragLeave={(e) => handleDrag(e, false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          {isUploading ? (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading artwork...</p>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-primary/10">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  Drop {collectionType === "one_of_one" ? "your unique artwork" : "edition artwork"} here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  PNG, JPG, GIF, WEBP up to 10MB each
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.getElementById('artwork-upload')?.click()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Select Files
                </Button>
              </div>
            </>
          )}
        </div>
        <input
          id="artwork-upload"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Stats */}
      {artworks.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <FileImage className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {artworks.length} artwork{artworks.length !== 1 ? 's' : ''} uploaded
            </span>
          </div>
          <Badge variant="outline">
            {maxItems - artworks.length} slots remaining
          </Badge>
        </div>
      )}

      {/* Artwork Grid */}
      {artworks.length > 0 && (
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {artworks.map((artwork, index) => (
              <Card 
                key={artwork.id}
                className={`group relative overflow-hidden transition-all ${
                  editingId === artwork.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="aspect-square relative">
                  {artwork.imageUrl ? (
                    <img 
                      src={artwork.imageUrl}
                      alt={artwork.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingId(editingId === artwork.id ? null : artwork.id)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeArtwork(artwork.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Index Badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 text-xs"
                  >
                    #{index + 1}
                  </Badge>
                </div>

                <CardContent className="p-3 space-y-2">
                  {editingId === artwork.id ? (
                    <>
                      <Input
                        value={artwork.name}
                        onChange={(e) => updateArtwork(artwork.id, { name: e.target.value })}
                        placeholder="Artwork name"
                        className="h-8 text-sm"
                      />
                      <Textarea
                        value={artwork.description || ""}
                        onChange={(e) => updateArtwork(artwork.id, { description: e.target.value })}
                        placeholder="Description (optional)"
                        className="text-sm min-h-[60px]"
                        rows={2}
                      />
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => setEditingId(null)}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Done
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-sm truncate">{artwork.name}</p>
                      {artwork.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {artwork.description}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Empty State */}
      {artworks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            No artwork uploaded yet. 
            {collectionType === "one_of_one" 
              ? " Upload unique images for each NFT in your collection."
              : " Upload your edition artwork."}
          </p>
        </div>
      )}
    </div>
  );
}
