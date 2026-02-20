import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LayerManager, type Layer } from "./LayerManager";
import { BulkTraitUploader } from "./BulkTraitUploader";
import {
    FolderOpen, Upload, Sparkles, Layers, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HybridTraitUploadProps {
    layers: Layer[];
    onLayersChange: (layers: Layer[]) => void;
}

export function HybridTraitUpload({ layers, onLayersChange }: HybridTraitUploadProps) {
    const [bulkOpen, setBulkOpen] = React.useState(false);
    const [bulkLayer, setBulkLayer] = React.useState<string>("");

    const totalTraits = layers.reduce((sum, l) => sum + l.traits.length, 0);
    const combinations = layers.length > 0
        ? layers.reduce((acc, l) => acc * (l.visible ? Math.max(l.traits.length, 1) : 1), 1)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-primary" />
                    </div>
                    Upload Trait Layers
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Import folders for each trait category (e.g. Background, Body, Eyes, Hat).
                    Each folder becomes a layer with its images as traits.
                </p>
            </div>

            {/* Info card */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-3 px-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-medium">How it works: </span>
                        Select a folder that contains your trait images (PNG/WebP). The folder name
                        becomes the layer name and each image becomes a trait. Layers are composited
                        in order — drag to reorder. You'll set rarity weights in the next step.
                    </div>
                </CardContent>
            </Card>

            {/* Layer manager (handles folder uploads) */}
            <LayerManager layers={layers} onLayersChange={onLayersChange} />

            {/* Stats summary */}
            {layers.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                        <p className="text-lg font-bold text-primary">{layers.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Layers</p>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                        <p className="text-lg font-bold text-primary">{totalTraits}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Traits</p>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                        <p className="text-lg font-bold text-primary">{combinations.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Combinations</p>
                    </div>
                </div>
            )}
        </div>
    );
}
