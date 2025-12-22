import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Download,
  RefreshCw,
  Maximize2,
  Grid3X3,
  Image as ImageIcon,
  Loader2,
  ZoomIn,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Layer, Trait, BlendMode } from "./LayerManager";
import { TraitRule } from "./TraitRulesManager";

interface NFTImageCompositorProps {
  layers: Layer[];
  rules: TraitRule[];
  canvasSize?: number;
}

interface GeneratedNFT {
  id: number;
  traits: { layerId: string; layerName: string; trait: Trait; blendMode: BlendMode; opacity: number }[];
  imageDataUrl?: string;
}

export function NFTImageCompositor({
  layers,
  rules,
  canvasSize = 512,
}: NFTImageCompositorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generatedNFTs, setGeneratedNFTs] = useState<GeneratedNFT[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewCount, setPreviewCount] = useState(4);
  const [selectedNFT, setSelectedNFT] = useState<GeneratedNFT | null>(null);
  const [gridCols, setGridCols] = useState(2);

  const selectTraitForLayer = useCallback(
    (
      layer: Layer,
      selectedTraits: Map<string, string>
    ): Trait | null => {
      // Check if layer is optional and randomly skip
      if (layer.isOptional && Math.random() * 100 > layer.optionalChance) {
        return null;
      }

      if (layer.traits.length === 0) return null;

      // Get applicable rules for already selected traits
      const applicableRules = rules.filter((rule) => {
        const sourceSelected = selectedTraits.get(rule.sourceLayerId);
        return sourceSelected === rule.sourceTraitId;
      });

      // Find forced traits for this layer
      const forcedTraits = applicableRules
        .filter((r) => r.type === "forces" && r.targetLayerId === layer.id)
        .map((r) => r.targetTraitId);

      if (forcedTraits.length > 0) {
        const forcedTrait = layer.traits.find((t) => t.id === forcedTraits[0]);
        if (forcedTrait) return forcedTrait;
      }

      // Filter out incompatible traits
      const incompatibleTraits = applicableRules
        .filter((r) => r.type === "incompatible" && r.targetLayerId === layer.id)
        .map((r) => r.targetTraitId);

      const availableTraits = layer.traits.filter(
        (t) => !incompatibleTraits.includes(t.id)
      );

      const traitsToUse = availableTraits.length > 0 ? availableTraits : layer.traits;

      // Weighted random selection
      const totalRarity = traitsToUse.reduce((sum, t) => sum + t.rarity, 0);
      let random = Math.random() * totalRarity;
      for (const trait of traitsToUse) {
        random -= trait.rarity;
        if (random <= 0) return trait;
      }

      return traitsToUse[0];
    },
    [rules]
  );

  const compositeImage = useCallback(
    async (traits: GeneratedNFT["traits"]): Promise<string> => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not get canvas context");

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // Load and draw each layer in order with blend modes and opacity
      for (const { trait, blendMode, opacity } of traits) {
        if (trait.imageUrl) {
          try {
            const img = await loadImage(trait.imageUrl);
            
            // Save current context state
            ctx.save();
            
            // Apply blend mode
            ctx.globalCompositeOperation = blendMode;
            
            // Apply opacity (0-100 to 0-1)
            ctx.globalAlpha = opacity / 100;
            
            // Draw the image
            ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
            
            // Restore context state
            ctx.restore();
          } catch (error) {
            console.warn(`Failed to load image for trait: ${trait.name}`, error);
          }
        }
      }

      return canvas.toDataURL("image/png");
    },
    [canvasSize]
  );

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const generatePreviews = useCallback(async () => {
    setIsGenerating(true);
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
    const previews: GeneratedNFT[] = [];

    for (let i = 0; i < previewCount; i++) {
      const selectedTraits = new Map<string, string>();
      const nftTraits: GeneratedNFT["traits"] = [];

      for (const layer of sortedLayers) {
        const selectedTrait = selectTraitForLayer(layer, selectedTraits);
        if (selectedTrait) {
          selectedTraits.set(layer.id, selectedTrait.id);
          nftTraits.push({
            layerId: layer.id,
            layerName: layer.name,
            trait: selectedTrait,
            blendMode: layer.blendMode,
            opacity: layer.opacity,
          });
        }
      }

      // Check if any trait has an image
      const hasImages = nftTraits.some((t) => t.trait.imageUrl);
      let imageDataUrl: string | undefined;

      if (hasImages) {
        try {
          imageDataUrl = await compositeImage(nftTraits);
        } catch (error) {
          console.error("Failed to composite image:", error);
        }
      }

      previews.push({ id: i + 1, traits: nftTraits, imageDataUrl });
    }

    setGeneratedNFTs(previews);
    setIsGenerating(false);
  }, [layers, previewCount, selectTraitForLayer, compositeImage]);

  const downloadImage = (nft: GeneratedNFT) => {
    if (!nft.imageDataUrl) return;

    const link = document.createElement("a");
    link.download = `nft-preview-${nft.id}.png`;
    link.href = nft.imageDataUrl;
    link.click();
  };

  const downloadAll = () => {
    generatedNFTs.forEach((nft, index) => {
      if (nft.imageDataUrl) {
        setTimeout(() => downloadImage(nft), index * 200);
      }
    });
  };

  // Check if any layer has images
  const hasAnyImages = layers.some((l) => l.traits.some((t) => t.imageUrl));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Image Compositor
          </h4>
          <p className="text-xs text-muted-foreground">
            Generate visual NFT previews from layer images
          </p>
        </div>
      </div>

      {!hasAnyImages && (
        <div className="p-4 border border-dashed rounded-lg text-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Add images to your traits to generate visual previews
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click on trait thumbnails in the Layers tab to upload images
          </p>
        </div>
      )}

      {hasAnyImages && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Count:</Label>
              <Slider
                value={[previewCount]}
                onValueChange={([v]) => setPreviewCount(v)}
                min={1}
                max={12}
                step={1}
                className="w-24"
              />
              <span className="text-xs w-6">{previewCount}</span>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Grid:</Label>
              <div className="flex gap-1">
                {[2, 3, 4].map((cols) => (
                  <Button
                    key={cols}
                    variant={gridCols === cols ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setGridCols(cols)}
                  >
                    <span className="text-xs">{cols}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1" />

            <Button
              onClick={generatePreviews}
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>

            {generatedNFTs.some((n) => n.imageDataUrl) && (
              <Button onClick={downloadAll} size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            )}
          </div>

          {/* Generated Previews Grid */}
          {generatedNFTs.length > 0 && (
            <ScrollArea className="h-[350px]">
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
              >
                {generatedNFTs.map((nft) => (
                  <Card
                    key={nft.id}
                    className="overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
                    onClick={() => setSelectedNFT(nft)}
                  >
                    <div className="aspect-square bg-muted/30 relative">
                      {nft.imageDataUrl ? (
                        <img
                          src={nft.imageDataUrl}
                          alt={`NFT Preview ${nft.id}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center p-2">
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <span className="text-lg font-bold">#{nft.id}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              No images
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          #{nft.id}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNFT(nft);
                          }}
                        >
                          <ZoomIn className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {nft.traits.slice(0, 3).map((t, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] truncate max-w-[80px]"
                          >
                            {t.trait.name}
                          </Badge>
                        ))}
                        {nft.traits.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{nft.traits.length - 3}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {generatedNFTs.length === 0 && (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <Grid3X3 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Click Generate to create visual NFT previews
              </p>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedNFT} onOpenChange={() => setSelectedNFT(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>NFT Preview #{selectedNFT?.id}</DialogTitle>
          </DialogHeader>
          {selectedNFT && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="aspect-square bg-muted/30 rounded-lg overflow-hidden">
                {selectedNFT.imageDataUrl ? (
                  <img
                    src={selectedNFT.imageDataUrl}
                    alt={`NFT Preview ${selectedNFT.id}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-muted-foreground">No image</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Traits</h4>
                  <div className="space-y-2">
                    {selectedNFT.traits.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">
                            {t.layerName}
                          </span>
                          {(t.blendMode !== "source-over" || t.opacity !== 100) && (
                            <span className="text-[10px] text-muted-foreground/70">
                              {t.blendMode !== "source-over" && t.blendMode}
                              {t.blendMode !== "source-over" && t.opacity !== 100 && " • "}
                              {t.opacity !== 100 && `${t.opacity}% opacity`}
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary">{t.trait.name}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedNFT.imageDataUrl && (
                  <Button
                    onClick={() => downloadImage(selectedNFT)}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PNG
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for compositing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
