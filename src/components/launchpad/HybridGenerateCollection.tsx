import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { GenerationPreview } from "./GenerationPreview";
import { type Layer } from "./LayerManager";
import { type TraitRule } from "./TraitRulesManager";
import { Wand2, FileText, Info } from "lucide-react";

interface HybridGenerateCollectionProps {
    layers: Layer[];
    rules: TraitRule[];
    totalSupply: string;
    collectionName: string;
    onCollectionNameChange: (name: string) => void;
    collectionDescription: string;
    onCollectionDescriptionChange: (desc: string) => void;
}

export function HybridGenerateCollection({
    layers,
    rules,
    totalSupply,
    collectionName,
    onCollectionNameChange,
    collectionDescription,
    onCollectionDescriptionChange,
}: HybridGenerateCollectionProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Wand2 className="w-4 h-4 text-primary" />
                    </div>
                    Generate Collection
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Name your collection, preview generated NFTs, and export the images + metadata as a ZIP.
                </p>
            </div>

            {/* Collection info inputs */}
            <Card className="border-border/60">
                <CardContent className="py-4 px-5 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Collection Info</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">
                                Collection Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                placeholder="My Hybrid Collection"
                                value={collectionName}
                                onChange={(e) => onCollectionNameChange(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Description</Label>
                            <Textarea
                                placeholder="A unique generative collection..."
                                value={collectionDescription}
                                onChange={(e) => onCollectionDescriptionChange(e.target.value)}
                                rows={2}
                                className="resize-none"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Generation preview (reused from existing component) */}
            <GenerationPreview
                layers={layers}
                rules={rules}
                totalSupply={totalSupply}
                collectionName={collectionName}
                collectionDescription={collectionDescription}
            />

            {/* Info */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-3 px-4 flex items-start gap-3">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-medium">Export: </span>
                        Click "Export ZIP" to download all generated images and metadata JSON files.
                        You'll upload this collection on-chain separately. The metadata format follows
                        the Metaplex standard.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
