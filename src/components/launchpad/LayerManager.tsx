import React, { useState, useCallback } from "react";
import { motion, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FolderPlus,
  GripVertical,
  Trash2,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export interface LayerTrait {
  id: string;
  name: string;
  file: File;
  preview: string;
  rarity: number; // 1-100
}

export interface Layer {
  id: string;
  name: string;
  traits: LayerTrait[];
  visible: boolean;
  collapsed: boolean;
}

interface LayerManagerProps {
  layers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
}

export function LayerManager({ layers, onLayersChange }: LayerManagerProps) {
  // Handle folder input for a layer
  const handleAddLayer = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Get folder name from first file's path
    const firstFile = files[0];
    const pathParts = firstFile.webkitRelativePath.split("/");
    const layerName = pathParts[0] || `Layer ${layers.length + 1}`;

    // Filter only images
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      toast.error("No images found in folder");
      return;
    }

    // Create traits from images
    const traits: LayerTrait[] = await Promise.all(
      imageFiles.map(async (file) => {
        const preview = await readFileAsDataURL(file);
        const traitName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension

        return {
          id: crypto.randomUUID(),
          name: traitName,
          file,
          preview,
          rarity: Math.round(100 / imageFiles.length), // Equal distribution initially
        };
      })
    );

    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name: layerName,
      traits,
      visible: true,
      collapsed: false,
    };

    onLayersChange([...layers, newLayer]);
    toast.success(`Added layer "${layerName}" with ${traits.length} traits`);

    // Reset input
    e.target.value = "";
  }, [layers, onLayersChange]);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const removeLayer = (layerId: string) => {
    onLayersChange(layers.filter((l) => l.id !== layerId));
  };

  const toggleLayerVisibility = (layerId: string) => {
    onLayersChange(
      layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      )
    );
  };

  const toggleLayerCollapse = (layerId: string) => {
    onLayersChange(
      layers.map((l) =>
        l.id === layerId ? { ...l, collapsed: !l.collapsed } : l
      )
    );
  };

  const updateLayerName = (layerId: string, name: string) => {
    onLayersChange(
      layers.map((l) => (l.id === layerId ? { ...l, name } : l))
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold gradient-text flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Trait Layers
          </h3>
          <p className="text-xs text-muted-foreground">
            Import folders for each layer (Background, Body, Eyes, etc.)
          </p>
        </div>

        <label className="cursor-pointer">
          <Input
            type="file"
            // @ts-ignore - webkitdirectory is valid but not typed
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={handleAddLayer}
          />
          <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-md" size="sm" asChild>
            <span>
              <FolderPlus className="w-4 h-4 mr-2" />
              Add Layer Folder
            </span>
          </Button>
        </label>
      </div>

      {/* Layers List */}
      {layers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-2 border-dashed border-border p-10 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-primary" />
          </div>
          <h4 className="font-semibold text-foreground mb-2">No layers added yet</h4>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Click "Add Layer Folder" to import your first layer. Each folder should contain trait variations.
          </p>
        </motion.div>
      ) : (
        <Reorder.Group
          axis="y"
          values={layers}
          onReorder={onLayersChange}
          className="space-y-3"
        >
          {layers.map((layer, index) => (
            <Reorder.Item
              key={layer.id}
              value={layer}
              className="cursor-grab active:cursor-grabbing"
            >
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl glass-card overflow-hidden ${layer.visible
                    ? "border-border"
                    : "opacity-60"
                  }`}
              >
                {/* Layer Header */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-muted/50 to-transparent">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />

                  <Badge className="bg-primary/20 text-primary border-primary/30 font-mono text-xs">
                    {index + 1}
                  </Badge>

                  <Input
                    value={layer.name}
                    onChange={(e) => updateLayerName(layer.id, e.target.value)}
                    className="flex-1 h-8 bg-transparent border-transparent hover:border-border focus:border-primary px-2 font-medium"
                  />

                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {layer.traits.length} traits
                  </Badge>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10"
                      onClick={() => toggleLayerVisibility(layer.id)}
                    >
                      {layer.visible ? (
                        <Eye className="w-4 h-4 text-primary" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleLayerCollapse(layer.id)}
                    >
                      {layer.collapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeLayer(layer.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Traits Preview */}
                {!layer.collapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 overflow-hidden"
                  >
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/20">
                      {layer.traits.slice(0, 8).map((trait, traitIndex) => (
                        <motion.div
                          key={trait.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: traitIndex * 0.05 }}
                          className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-border bg-card hover:border-primary transition-colors"
                          title={trait.name}
                        >
                          <img
                            src={trait.preview}
                            alt={trait.name}
                            className="w-full h-full object-contain"
                          />
                        </motion.div>
                      ))}
                      {layer.traits.length > 8 && (
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-border bg-muted/50 flex items-center justify-center">
                          <span className="text-xs font-medium text-muted-foreground">
                            +{layer.traits.length - 8}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {/* Info Card */}
      {layers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-4 border-primary/30"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground font-medium">
                Total Combinations:{" "}
                <span className="font-mono text-primary">
                  {layers.reduce((acc, l) => acc * (l.visible ? l.traits.length : 1), 1).toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Drag layers to reorder. Top layer renders last (on top).
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
