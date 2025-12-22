import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  Upload,
  ChevronDown,
  ChevronUp,
  Layers,
  Image as ImageIcon,
  FolderOpen,
  Blend,
  Scale,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BulkTraitUploader } from "./BulkTraitUploader";

export interface Trait {
  id: string;
  name: string;
  imageUrl?: string;
  rarity: number; // 1-100 percentage
}

export type BlendMode = 
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "source-over", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "color-burn", label: "Color Burn" },
  { value: "hard-light", label: "Hard Light" },
  { value: "soft-light", label: "Soft Light" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
  { value: "hue", label: "Hue" },
  { value: "saturation", label: "Saturation" },
  { value: "color", label: "Color" },
  { value: "luminosity", label: "Luminosity" },
];

export interface Layer {
  id: string;
  name: string;
  order: number;
  traits: Trait[];
  isOptional: boolean;
  optionalChance: number; // 0-100, chance that this layer appears at all
  blendMode: BlendMode;
  opacity: number; // 0-100
}

interface LayerManagerProps {
  layers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
}

export function LayerManager({ layers, onLayersChange }: LayerManagerProps) {
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [bulkUploadLayer, setBulkUploadLayer] = useState<Layer | null>(null);

  const addLayer = () => {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name: `Layer ${layers.length + 1}`,
      order: layers.length,
      traits: [],
      isOptional: false,
      optionalChance: 100,
      blendMode: "source-over",
      opacity: 100,
    };
    onLayersChange([...layers, newLayer]);
    setExpandedLayers((prev) => new Set([...prev, newLayer.id]));
  };

  const removeLayer = (layerId: string) => {
    onLayersChange(layers.filter((l) => l.id !== layerId));
  };

  const updateLayer = (layerId: string, updates: Partial<Layer>) => {
    onLayersChange(
      layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l))
    );
  };

  const moveLayer = (layerId: string, direction: "up" | "down") => {
    const index = layers.findIndex((l) => l.id === layerId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === layers.length - 1)
    ) {
      return;
    }

    const newLayers = [...layers];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newLayers[index], newLayers[swapIndex]] = [
      newLayers[swapIndex],
      newLayers[index],
    ];

    // Update order values
    newLayers.forEach((layer, i) => {
      layer.order = i;
    });

    onLayersChange(newLayers);
  };

  const addTrait = (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    const newTrait: Trait = {
      id: crypto.randomUUID(),
      name: `Trait ${layer.traits.length + 1}`,
      rarity: 50,
    };

    updateLayer(layerId, { traits: [...layer.traits, newTrait] });
  };

  const addBulkTraits = (layerId: string, traits: Trait[]) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    updateLayer(layerId, { traits: [...layer.traits, ...traits] });
  };

  const removeTrait = (layerId: string, traitId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    updateLayer(layerId, {
      traits: layer.traits.filter((t) => t.id !== traitId),
    });
  };

  const updateTrait = (
    layerId: string,
    traitId: string,
    updates: Partial<Trait>
  ) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    updateLayer(layerId, {
      traits: layer.traits.map((t) =>
        t.id === traitId ? { ...t, ...updates } : t
      ),
    });
  };

  const handleTraitImageUpload = (
    layerId: string,
    traitId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateTrait(layerId, traitId, { imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleExpanded = (layerId: string) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const getTotalRarity = (traits: Trait[]) => {
    return traits.reduce((sum, t) => sum + t.rarity, 0);
  };

  const autoBalanceRarities = (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || layer.traits.length === 0) return;

    const traitCount = layer.traits.length;
    const baseRarity = Math.floor(100 / traitCount);
    const remainder = 100 - baseRarity * traitCount;

    const balancedTraits = layer.traits.map((trait, index) => ({
      ...trait,
      rarity: baseRarity + (index < remainder ? 1 : 0),
    }));

    updateLayer(layerId, { traits: balancedTraits });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Layers & Traits
          </h3>
          <p className="text-sm text-muted-foreground">
            Define layers and traits with rarity weights
          </p>
        </div>
        <Button onClick={addLayer} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Layer
        </Button>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {layers
            .sort((a, b) => a.order - b.order)
            .map((layer, index) => (
              <Collapsible
                key={layer.id}
                open={expandedLayers.has(layer.id)}
                onOpenChange={() => toggleExpanded(layer.id)}
              >
                <Card className="border-border/50">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(layer.id, "up");
                            }}
                            disabled={index === 0}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(layer.id, "down");
                            }}
                            disabled={index === layers.length - 1}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </div>
                        <Input
                          value={layer.name}
                          onChange={(e) =>
                            updateLayer(layer.id, { name: e.target.value })
                          }
                          className="w-40 h-8"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Badge variant="secondary" className="text-xs">
                          {layer.traits.length} traits
                        </Badge>
                        {layer.isOptional && (
                          <Badge variant="outline" className="text-xs">
                            Optional ({layer.optionalChance}%)
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {expandedLayers.has(layer.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLayer(layer.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Blend Mode & Opacity Controls */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Blend className="w-3 h-3" />
                            Blend Mode
                          </Label>
                          <Select
                            value={layer.blendMode}
                            onValueChange={(value: BlendMode) =>
                              updateLayer(layer.id, { blendMode: value })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BLEND_MODES.map((mode) => (
                                <SelectItem key={mode.value} value={mode.value}>
                                  {mode.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Opacity: {layer.opacity}%
                          </Label>
                          <Slider
                            value={[layer.opacity]}
                            onValueChange={([value]) =>
                              updateLayer(layer.id, { opacity: value })
                            }
                            max={100}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      {/* Optional Layer Settings */}
                      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={layer.isOptional}
                            onChange={(e) =>
                              updateLayer(layer.id, {
                                isOptional: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          Optional Layer
                        </label>
                        {layer.isOptional && (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs text-muted-foreground">
                              Appear Chance:
                            </span>
                            <Slider
                              value={[layer.optionalChance]}
                              onValueChange={([value]) =>
                                updateLayer(layer.id, { optionalChance: value })
                              }
                              max={100}
                              step={1}
                              className="flex-1 max-w-[150px]"
                            />
                            <span className="text-xs w-8">
                              {layer.optionalChance}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Traits */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Traits</Label>
                          <div className="flex gap-1">
                            {layer.traits.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => autoBalanceRarities(layer.id)}
                                title="Distribute rarity evenly"
                              >
                                <Scale className="w-3 h-3 mr-1" />
                                Auto-Balance
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setBulkUploadLayer(layer)}
                            >
                              <FolderOpen className="w-3 h-3 mr-1" />
                              Bulk Upload
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addTrait(layer.id)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Trait
                            </Button>
                          </div>
                        </div>

                        {layer.traits.length === 0 ? (
                          <div 
                            className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => setBulkUploadLayer(layer)}
                          >
                            <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p>No traits added yet</p>
                            <p className="text-xs mt-1">Click to bulk upload images</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {getTotalRarity(layer.traits) !== 100 && (
                              <p className="text-xs text-yellow-500">
                                ⚠️ Total rarity is {getTotalRarity(layer.traits)}
                                % (should be 100%)
                              </p>
                            )}
                            {layer.traits.map((trait) => (
                              <div
                                key={trait.id}
                                className="flex items-center gap-3 p-2 bg-background border rounded-lg"
                              >
                                {/* Trait Image */}
                                <div
                                  className="w-10 h-10 rounded border border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 overflow-hidden"
                                  onClick={() =>
                                    document
                                      .getElementById(
                                        `trait-img-${trait.id}`
                                      )
                                      ?.click()
                                  }
                                >
                                  {trait.imageUrl ? (
                                    <img
                                      src={trait.imageUrl}
                                      alt={trait.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <input
                                    id={`trait-img-${trait.id}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleTraitImageUpload(
                                        layer.id,
                                        trait.id,
                                        e
                                      )
                                    }
                                  />
                                </div>

                                {/* Trait Name */}
                                <Input
                                  value={trait.name}
                                  onChange={(e) =>
                                    updateTrait(layer.id, trait.id, {
                                      name: e.target.value,
                                    })
                                  }
                                  className="flex-1 h-8"
                                  placeholder="Trait name"
                                />

                                {/* Rarity Slider */}
                                <div className="flex items-center gap-2 min-w-[120px]">
                                  <Slider
                                    value={[trait.rarity]}
                                    onValueChange={([value]) =>
                                      updateTrait(layer.id, trait.id, {
                                        rarity: value,
                                      })
                                    }
                                    max={100}
                                    step={1}
                                    className="flex-1"
                                  />
                                  <span className="text-xs w-8 text-muted-foreground">
                                    {trait.rarity}%
                                  </span>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    removeTrait(layer.id, trait.id)
                                  }
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}

          {layers.length === 0 && (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No layers defined yet
              </p>
              <Button onClick={addLayer} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add First Layer
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bulk Upload Modal */}
      {bulkUploadLayer && (
        <BulkTraitUploader
          open={!!bulkUploadLayer}
          onOpenChange={(open) => !open && setBulkUploadLayer(null)}
          layerName={bulkUploadLayer.name}
          existingTraits={bulkUploadLayer.traits}
          onTraitsAdd={(traits) => {
            addBulkTraits(bulkUploadLayer.id, traits);
            setBulkUploadLayer(null);
          }}
        />
      )}
    </div>
  );
}
