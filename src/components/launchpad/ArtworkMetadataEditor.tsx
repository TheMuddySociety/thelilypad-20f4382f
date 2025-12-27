import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

export interface ArtworkTrait {
  trait_type: string;
  value: string;
}

export interface ArtworkMetadata {
  description: string;
  traits: ArtworkTrait[];
}

export interface OneOfOneArtwork {
  id: string;
  file: File;
  preview: string;
  name: string;
  metadata?: ArtworkMetadata;
}

interface ArtworkMetadataEditorProps {
  artwork: OneOfOneArtwork;
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (artwork: OneOfOneArtwork) => void;
}

export function ArtworkMetadataEditor({
  artwork,
  index,
  open,
  onOpenChange,
  onSave,
}: ArtworkMetadataEditorProps) {
  const [name, setName] = useState(artwork.name);
  const [description, setDescription] = useState(artwork.metadata?.description || "");
  const [traits, setTraits] = useState<ArtworkTrait[]>(
    artwork.metadata?.traits || []
  );
  const [newTraitType, setNewTraitType] = useState("");
  const [newTraitValue, setNewTraitValue] = useState("");

  const handleAddTrait = () => {
    if (!newTraitType.trim() || !newTraitValue.trim()) {
      toast.error("Both trait type and value are required");
      return;
    }

    setTraits([...traits, { trait_type: newTraitType.trim(), value: newTraitValue.trim() }]);
    setNewTraitType("");
    setNewTraitValue("");
  };

  const handleRemoveTrait = (idx: number) => {
    setTraits(traits.filter((_, i) => i !== idx));
  };

  const handleUpdateTrait = (idx: number, field: "trait_type" | "value", value: string) => {
    const updated = [...traits];
    updated[idx] = { ...updated[idx], [field]: value };
    setTraits(updated);
  };

  const handleSave = () => {
    onSave({
      ...artwork,
      name: name.trim() || artwork.name,
      metadata: {
        description: description.trim(),
        traits,
      },
    });
    onOpenChange(false);
    toast.success("Metadata saved");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Edit Metadata - #{index + 1}
          </DialogTitle>
          <DialogDescription>
            Add description and custom traits for this artwork
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img
              src={artwork.preview}
              alt={artwork.name}
              className="w-full aspect-square object-cover"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="artwork-name">Name</Label>
            <Input
              id="artwork-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Artwork name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="artwork-description">Description</Label>
            <Textarea
              id="artwork-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this artwork..."
              rows={3}
            />
          </div>

          {/* Traits */}
          <div className="space-y-3">
            <Label>Traits / Attributes</Label>
            
            {/* Existing Traits */}
            {traits.length > 0 && (
              <div className="space-y-2">
                {traits.map((trait, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={trait.trait_type}
                      onChange={(e) => handleUpdateTrait(idx, "trait_type", e.target.value)}
                      placeholder="Trait type"
                      className="flex-1"
                    />
                    <Input
                      value={trait.value}
                      onChange={(e) => handleUpdateTrait(idx, "value", e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveTrait(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Trait */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Input
                value={newTraitType}
                onChange={(e) => setNewTraitType(e.target.value)}
                placeholder="e.g. Background"
                className="flex-1 bg-background"
                onKeyDown={(e) => e.key === "Enter" && handleAddTrait()}
              />
              <Input
                value={newTraitValue}
                onChange={(e) => setNewTraitValue(e.target.value)}
                placeholder="e.g. Blue"
                className="flex-1 bg-background"
                onKeyDown={(e) => e.key === "Enter" && handleAddTrait()}
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-9 w-9"
                onClick={handleAddTrait}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add custom traits like Background, Rarity, Color, etc.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Metadata</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
