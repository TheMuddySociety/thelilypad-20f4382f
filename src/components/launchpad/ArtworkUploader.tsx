import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  X,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Plus,
  FileImage,
  Edit2,
  Check,
  CheckSquare,
  Square,
  Pencil,
  Hash,
  Type,
  FileText
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

type NamingPattern = "prefix" | "suffix" | "replace" | "numbered";

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
  
  // Selection mode for batch editing
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Batch edit modal
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [namingPattern, setNamingPattern] = useState<NamingPattern>("prefix");
  const [batchNameValue, setBatchNameValue] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [applyDescription, setApplyDescription] = useState(false);
  const [startNumber, setStartNumber] = useState(1);

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

      const id = `artwork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      
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
    selectedIds.delete(id);
    setSelectedIds(new Set(selectedIds));
  };

  const updateArtwork = (id: string, updates: Partial<ArtworkItem>) => {
    onArtworksChange(artworks.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  // Selection helpers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(artworks.map(a => a.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const deleteSelected = async () => {
    const selectedArtworks = artworks.filter(a => selectedIds.has(a.id));
    
    for (const artwork of selectedArtworks) {
      if (artwork.imageUrl && artwork.imageUrl.includes('collection-images')) {
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
    }
    
    onArtworksChange(artworks.filter(a => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    toast.success(`Deleted ${selectedArtworks.length} artwork${selectedArtworks.length > 1 ? 's' : ''}`);
  };

  // Batch edit logic
  const applyBatchEdit = () => {
    const selectedArtworksList = artworks.filter(a => selectedIds.has(a.id));
    
    if (selectedArtworksList.length === 0) {
      toast.error("No artworks selected");
      return;
    }

    const updatedArtworks = artworks.map((artwork, globalIndex) => {
      if (!selectedIds.has(artwork.id)) return artwork;
      
      const selectedIndex = selectedArtworksList.findIndex(a => a.id === artwork.id);
      let newName = artwork.name;
      
      switch (namingPattern) {
        case "prefix":
          if (batchNameValue) {
            newName = `${batchNameValue} ${artwork.name}`;
          }
          break;
        case "suffix":
          if (batchNameValue) {
            newName = `${artwork.name} ${batchNameValue}`;
          }
          break;
        case "replace":
          if (batchNameValue) {
            newName = batchNameValue;
          }
          break;
        case "numbered":
          if (batchNameValue) {
            newName = `${batchNameValue} #${startNumber + selectedIndex}`;
          } else {
            newName = `#${startNumber + selectedIndex}`;
          }
          break;
      }
      
      return {
        ...artwork,
        name: newName,
        description: applyDescription ? batchDescription : artwork.description
      };
    });

    onArtworksChange(updatedArtworks);
    setIsBatchEditOpen(false);
    setBatchNameValue("");
    setBatchDescription("");
    setApplyDescription(false);
    toast.success(`Updated ${selectedArtworksList.length} artwork${selectedArtworksList.length > 1 ? 's' : ''}`);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
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

      {/* Stats & Actions Bar */}
      {artworks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <FileImage className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {artworks.length} artwork{artworks.length !== 1 ? 's' : ''} uploaded
            </span>
            <Badge variant="outline">
              {maxItems - artworks.length} slots remaining
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {isSelectionMode ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setIsBatchEditOpen(true)}
                  disabled={selectedIds.size === 0}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Batch Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={deleteSelected}
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={exitSelectionMode}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsSelectionMode(true)}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Batch Edit
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Artwork Grid */}
      {artworks.length > 0 && (
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {artworks.map((artwork, index) => (
              <Card 
                key={artwork.id}
                className={`group relative overflow-hidden transition-all cursor-pointer ${
                  editingId === artwork.id ? 'ring-2 ring-primary' : ''
                } ${selectedIds.has(artwork.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                onClick={() => isSelectionMode && toggleSelection(artwork.id)}
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
                  
                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selectedIds.has(artwork.id) 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'bg-background/80 border-border'
                      }`}>
                        {selectedIds.has(artwork.id) && <Check className="w-4 h-4" />}
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay Controls (hidden in selection mode) */}
                  {!isSelectionMode && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(editingId === artwork.id ? null : artwork.id);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeArtwork(artwork.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Index Badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 text-xs"
                  >
                    #{index + 1}
                  </Badge>
                </div>

                <CardContent className="p-3 space-y-2">
                  {editingId === artwork.id && !isSelectionMode ? (
                    <>
                      <Input
                        value={artwork.name}
                        onChange={(e) => updateArtwork(artwork.id, { name: e.target.value })}
                        placeholder="Artwork name"
                        className="h-8 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Textarea
                        value={artwork.description || ""}
                        onChange={(e) => updateArtwork(artwork.id, { description: e.target.value })}
                        placeholder="Description (optional)"
                        className="text-sm min-h-[60px]"
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
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

      {/* Batch Edit Modal */}
      <Dialog open={isBatchEditOpen} onOpenChange={setIsBatchEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Batch Edit {selectedIds.size} Artwork{selectedIds.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Apply naming patterns and descriptions to multiple artworks at once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Naming Pattern */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Naming Pattern
              </Label>
              <Select value={namingPattern} onValueChange={(v) => setNamingPattern(v as NamingPattern)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefix">Add Prefix</SelectItem>
                  <SelectItem value="suffix">Add Suffix</SelectItem>
                  <SelectItem value="replace">Replace Name</SelectItem>
                  <SelectItem value="numbered">Numbered Sequence</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                value={batchNameValue}
                onChange={(e) => setBatchNameValue(e.target.value)}
                placeholder={
                  namingPattern === "prefix" ? "Prefix text..." :
                  namingPattern === "suffix" ? "Suffix text..." :
                  namingPattern === "replace" ? "New name..." :
                  "Base name (e.g., 'Cosmic Frog')"
                }
              />
              
              {namingPattern === "numbered" && (
                <div className="flex items-center gap-2">
                  <Label className="flex items-center gap-2 whitespace-nowrap">
                    <Hash className="w-4 h-4" />
                    Start at:
                  </Label>
                  <Input
                    type="number"
                    value={startNumber}
                    onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                    className="w-24"
                    min={1}
                  />
                </div>
              )}
              
              {/* Preview */}
              {batchNameValue && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                  <p className="text-sm font-medium">
                    {namingPattern === "prefix" && `${batchNameValue} [original name]`}
                    {namingPattern === "suffix" && `[original name] ${batchNameValue}`}
                    {namingPattern === "replace" && batchNameValue}
                    {namingPattern === "numbered" && `${batchNameValue} #${startNumber}`}
                  </p>
                </div>
              )}
            </div>
            
            {/* Description */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="applyDescription"
                  checked={applyDescription}
                  onCheckedChange={(checked) => setApplyDescription(checked === true)}
                />
                <Label htmlFor="applyDescription" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Update Description
                </Label>
              </div>
              
              {applyDescription && (
                <Textarea
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  placeholder="Enter description for all selected artworks..."
                  rows={3}
                />
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyBatchEdit}>
              <Check className="w-4 h-4 mr-2" />
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
