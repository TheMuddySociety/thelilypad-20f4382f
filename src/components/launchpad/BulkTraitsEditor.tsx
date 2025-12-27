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
import { Plus, Trash2, Tags, Check } from "lucide-react";
import { toast } from "sonner";
import { ArtworkTrait, OneOfOneArtwork } from "./ArtworkMetadataEditor";

interface BulkTraitsEditorProps {
  artworks: OneOfOneArtwork[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (artworks: OneOfOneArtwork[]) => void;
}

export function BulkTraitsEditor({
  artworks,
  open,
  onOpenChange,
  onApply,
}: BulkTraitsEditorProps) {
  const [traits, setTraits] = useState<ArtworkTrait[]>([]);
  const [newTraitType, setNewTraitType] = useState("");
  const [newTraitValue, setNewTraitValue] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);

  const handleAddTrait = () => {
    if (!newTraitType.trim() || !newTraitValue.trim()) {
      toast.error("Both trait type and value are required");
      return;
    }

    // Check for duplicate trait types
    if (traits.some(t => t.trait_type.toLowerCase() === newTraitType.trim().toLowerCase())) {
      toast.error("Trait type already added");
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

  const handleApply = () => {
    if (traits.length === 0) {
      toast.error("Add at least one trait to apply");
      return;
    }

    const updatedArtworks = artworks.map((artwork) => {
      const existingTraits = artwork.metadata?.traits || [];
      
      let newTraits: ArtworkTrait[];
      if (replaceExisting) {
        // Replace all existing traits with bulk traits
        newTraits = [...traits];
      } else {
        // Merge: add bulk traits, but don't override existing trait types
        const existingTypes = new Set(existingTraits.map(t => t.trait_type.toLowerCase()));
        const traitsToAdd = traits.filter(t => !existingTypes.has(t.trait_type.toLowerCase()));
        newTraits = [...existingTraits, ...traitsToAdd];
      }

      return {
        ...artwork,
        metadata: {
          description: artwork.metadata?.description || "",
          traits: newTraits,
        },
      };
    });

    onApply(updatedArtworks);
    onOpenChange(false);
    toast.success(`Applied ${traits.length} trait${traits.length !== 1 ? 's' : ''} to ${artworks.length} artwork${artworks.length !== 1 ? 's' : ''}`);
    
    // Reset state
    setTraits([]);
    setReplaceExisting(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTraits([]);
      setNewTraitType("");
      setNewTraitValue("");
      setReplaceExisting(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            Bulk Apply Traits
          </DialogTitle>
          <DialogDescription>
            Add common traits to all {artworks.length} artwork{artworks.length !== 1 ? 's' : ''} at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Common trait examples */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-2">Common traits to apply:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { type: "Artist", value: "Your Name" },
                { type: "Collection", value: "Collection Name" },
                { type: "Year", value: "2025" },
                { type: "Medium", value: "Digital Art" },
              ].map(({ type, value }) => (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (!traits.some(t => t.trait_type.toLowerCase() === type.toLowerCase())) {
                      setNewTraitType(type);
                      setNewTraitValue(value);
                    }
                  }}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Traits to apply */}
          <div className="space-y-3">
            <Label>Traits to Apply</Label>
            
            {/* Added Traits */}
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
                placeholder="e.g. Artist"
                className="flex-1 bg-background"
                onKeyDown={(e) => e.key === "Enter" && handleAddTrait()}
              />
              <Input
                value={newTraitValue}
                onChange={(e) => setNewTraitValue(e.target.value)}
                placeholder="e.g. John Doe"
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

            {traits.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Add traits above to apply them to all artworks
              </p>
            )}
          </div>

          {/* Replace option */}
          <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
            <button
              type="button"
              onClick={() => setReplaceExisting(!replaceExisting)}
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                replaceExisting 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-muted-foreground"
              }`}
            >
              {replaceExisting && <Check className="h-3 w-3" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium">Replace existing traits</p>
              <p className="text-xs text-muted-foreground">
                {replaceExisting 
                  ? "Will replace all existing traits on each artwork" 
                  : "Will only add traits that don't already exist"}
              </p>
            </div>
          </div>

          {/* Summary */}
          {traits.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm">
                <span className="font-medium">{traits.length} trait{traits.length !== 1 ? 's' : ''}</span> will be applied to{" "}
                <span className="font-medium">{artworks.length} artwork{artworks.length !== 1 ? 's' : ''}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={traits.length === 0}>
              <Tags className="h-4 w-4 mr-2" />
              Apply to All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
