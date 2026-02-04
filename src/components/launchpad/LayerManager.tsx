import React, { useCallback } from "react";
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

// Blend mode type for layer compositing
export type BlendMode = GlobalCompositeOperation;

export interface LayerTrait {
  id: string;
  name: string;
  file?: File;
  preview: string;
  rarity: number;
  /** Alias for preview - used by some components */
  imageUrl?: string;
}

// Trait is an alias for LayerTrait (used across components)
export type Trait = LayerTrait;

export interface Layer {
  id: string;
  name: string;
  traits: LayerTrait[];
  visible: boolean;
  collapsed: boolean;
  /** Layer order for compositing (lower = rendered first) */
  order?: number;
  /** Blend mode for compositing */
  blendMode?: BlendMode;
  /** Opacity 0-100 */
  opacity?: number;
  /** Whether this layer can be skipped */
  isOptional?: boolean;
  /** Chance (0-100) this optional layer appears */
  optionalChance?: number;
}

interface LayerManagerProps {
  layers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
}

export function LayerManager({ layers, onLayersChange }: LayerManagerProps) {
  const handleAddLayer = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const firstFile = files[0];
    const pathParts = firstFile.webkitRelativePath.split("/");
    const layerName = pathParts[0] || `Layer ${layers.length + 1}`;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      toast.error("No images found in folder");
      return;
    }

    const traits: LayerTrait[] = await Promise.all(
      imageFiles.map(async (file) => {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        return {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^/.]+$/, ""),
          file,
          preview,
          rarity: Math.round(100 / imageFiles.length),
        };
      })
    );

    onLayersChange([...layers, {
      id: crypto.randomUUID(),
      name: layerName,
      traits,
      visible: true,
      collapsed: false,
    }]);
    toast.success(`Added "${layerName}" with ${traits.length} traits`);
    e.target.value = "";
  }, [layers, onLayersChange]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold gradient-text flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary" />
            Trait Layers
          </h3>
          <p className="text-[10px] text-muted-foreground">Import folders for each layer</p>
        </div>

        <label className="cursor-pointer">
          <Input
            type="file"
            // @ts-ignore
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={handleAddLayer}
          />
          <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground h-7 text-xs px-3" size="sm" asChild>
            <span><FolderPlus className="w-3 h-3 mr-1" /> Add Layer</span>
          </Button>
        </label>
      </div>

      {/* Layers List */}
      {layers.length === 0 ? (
        <div className="glass-card border-dashed border-2 p-6 text-center">
          <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Click "Add Layer" to import trait folders</p>
        </div>
      ) : (
        <Reorder.Group axis="y" values={layers} onReorder={onLayersChange} className="space-y-2">
          {layers.map((layer, index) => (
            <Reorder.Item key={layer.id} value={layer} className="cursor-grab active:cursor-grabbing">
              <motion.div layout className={`rounded-lg glass-card overflow-hidden ${!layer.visible && "opacity-50"}`}>
                {/* Layer Header */}
                <div className="flex items-center gap-2 p-2 bg-muted/30">
                  <GripVertical className="w-3 h-3 text-muted-foreground" />
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] h-5 px-1.5">{index + 1}</Badge>
                  <Input
                    value={layer.name}
                    onChange={(e) => onLayersChange(layers.map((l) => l.id === layer.id ? { ...l, name: e.target.value } : l))}
                    className="flex-1 h-6 text-xs bg-transparent border-transparent hover:border-border focus:border-primary px-1"
                  />
                  <Badge variant="outline" className="text-[10px] h-5">
                    {layer.traits.length} traits
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onLayersChange(layers.map((l) => l.id === layer.id ? { ...l, visible: !l.visible } : l))}>
                    {layer.visible ? <Eye className="w-3 h-3 text-primary" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onLayersChange(layers.map((l) => l.id === layer.id ? { ...l, collapsed: !l.collapsed } : l))}>
                    {layer.collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => onLayersChange(layers.filter((l) => l.id !== layer.id))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* Traits Preview */}
                {!layer.collapsed && (
                  <div className="px-2 pb-2 flex gap-1.5 overflow-x-auto">
                    {layer.traits.slice(0, 6).map((trait) => (
                      <div key={trait.id} className="flex-shrink-0 w-10 h-10 rounded border border-border bg-card" title={trait.name}>
                        <img src={trait.preview} alt={trait.name} className="w-full h-full object-contain" />
                      </div>
                    ))}
                    {layer.traits.length > 6 && (
                      <div className="flex-shrink-0 w-10 h-10 rounded border-dashed border border-border flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">+{layer.traits.length - 6}</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {/* Info */}
      {layers.length > 0 && (
        <div className="flex items-center gap-2 p-2 glass-card text-xs">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">
            Combinations: <span className="font-mono text-primary font-bold">{layers.reduce((acc, l) => acc * (l.visible ? l.traits.length : 1), 1).toLocaleString()}</span>
          </span>
        </div>
      )}
    </div>
  );
}
