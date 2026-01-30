import React, { useState, useCallback } from "react";
import { motion, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [isDragging, setIsDragging] = useState(false);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Trait Layers</h3>
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
          <Button variant="outline" size="sm" asChild>
            <span>
              <FolderPlus className="w-4 h-4 mr-2" />
              Add Layer Folder
            </span>
          </Button>
        </label>
      </div>

      {/* Layers List */}
      {layers.length === 0 ? (
        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
          <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No layers added yet. Click "Add Layer Folder" to import your first layer.
          </p>
        </div>
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
                className={`rounded-xl border ${layer.visible
                    ? "border-white/10 bg-white/5"
                    : "border-white/5 bg-white/[0.02] opacity-60"
                  }`}
              >
                {/* Layer Header */}
                <div className="flex items-center gap-3 p-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />

                  <Badge variant="outline" className="font-mono text-xs">
                    {index + 1}
                  </Badge>

                  <Input
                    value={layer.name}
                    onChange={(e) => updateLayerName(layer.id, e.target.value)}
                    className="flex-1 h-8 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 px-2"
                  />

                  <span className="text-xs text-muted-foreground">
                    {layer.traits.length} traits
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleLayerVisibility(layer.id)}
                    >
                      {layer.visible ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
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
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
                    className="px-3 pb-3 overflow-hidden"
                  >
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {layer.traits.slice(0, 8).map((trait) => (
                        <div
                          key={trait.id}
                          className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/50"
                          title={trait.name}
                        >
                          <img
                            src={trait.preview}
                            alt={trait.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                      {layer.traits.length > 8 && (
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">
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

      {/* Info */}
      {layers.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-xs text-blue-300">
            <strong>Tip:</strong> Drag layers to reorder. Top layer = rendered last (on top).
            Total combinations:{" "}
            <span className="font-mono font-bold">
              {layers.reduce((acc, l) => acc * (l.visible ? l.traits.length : 1), 1).toLocaleString()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
