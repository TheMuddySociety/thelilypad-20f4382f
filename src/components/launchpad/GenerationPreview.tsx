import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Shuffle, Eye, Download, Sparkles, Info, Image as ImageIcon, FileJson, Package, Loader2, Images, FolderArchive } from "lucide-react";
import { Layer, Trait, BlendMode } from "./LayerManager";
import { TraitRule, RuleType } from "./TraitRulesManager";
import { NFTImageCompositor } from "./NFTImageCompositor";
import { toast } from "sonner";

interface GenerationPreviewProps {
  layers: Layer[];
  rules: TraitRule[];
  totalSupply: string;
  collectionName?: string;
  collectionDescription?: string;
}

interface GeneratedNFT {
  id: number;
  traits: { layerId: string; layerName: string; traitId: string; traitName: string; imageUrl?: string; blendMode?: BlendMode; opacity?: number }[];
}

interface GeneratedNFTWithImage extends GeneratedNFT {
  imageDataUrl?: string;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
}

export function GenerationPreview({
  layers,
  rules,
  totalSupply,
  collectionName = "My Collection",
  collectionDescription = "",
}: GenerationPreviewProps) {
  const [previewCount, setPreviewCount] = useState("5");
  const [generatedPreviews, setGeneratedPreviews] = useState<GeneratedNFT[]>([]);
  const [exportCount, setExportCount] = useState(totalSupply || "100");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");

  const selectTraitForLayer = (
    layer: Layer,
    selectedTraits: Map<string, string>,
    allLayers: Layer[]
  ): string | null => {
    // Check if layer is optional and randomly skip
    if (layer.isOptional && Math.random() * 100 > layer.optionalChance) {
      return null;
    }

    if (layer.traits.length === 0) return null;

    // Get applicable rules for already selected traits
    const applicableRules = rules.filter((rule) => {
      // Check if source trait was selected
      const sourceSelected = selectedTraits.get(rule.sourceLayerId);
      return sourceSelected === rule.sourceTraitId;
    });

    // Find forced traits for this layer
    const forcedTraits = applicableRules
      .filter(
        (r) => r.type === "forces" && r.targetLayerId === layer.id
      )
      .map((r) => r.targetTraitId);

    if (forcedTraits.length > 0) {
      return forcedTraits[0]; // Return first forced trait
    }

    // Filter out incompatible traits
    const incompatibleTraits = applicableRules
      .filter(
        (r) => r.type === "incompatible" && r.targetLayerId === layer.id
      )
      .map((r) => r.targetTraitId);

    const availableTraits = layer.traits.filter(
      (t) => !incompatibleTraits.includes(t.id)
    );

    if (availableTraits.length === 0) {
      // If all traits are incompatible, just pick from original
      const totalRarity = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
      let random = Math.random() * totalRarity;
      for (const trait of layer.traits) {
        random -= trait.rarity;
        if (random <= 0) return trait.id;
      }
      return layer.traits[0].id;
    }

    // Weighted random selection from available traits
    const totalRarity = availableTraits.reduce((sum, t) => sum + t.rarity, 0);
    let random = Math.random() * totalRarity;
    for (const trait of availableTraits) {
      random -= trait.rarity;
      if (random <= 0) return trait.id;
    }

    return availableTraits[0].id;
  };

  const generateNFTBatch = (count: number): GeneratedNFT[] => {
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
    const previews: GeneratedNFT[] = [];

    for (let i = 0; i < count; i++) {
      const selectedTraits = new Map<string, string>();
      const nftTraits: GeneratedNFT["traits"] = [];

      for (const layer of sortedLayers) {
        const selectedTraitId = selectTraitForLayer(
          layer,
          selectedTraits,
          layers
        );
        if (selectedTraitId) {
          selectedTraits.set(layer.id, selectedTraitId);
          const trait = layer.traits.find((t) => t.id === selectedTraitId);
          if (trait) {
            nftTraits.push({
              layerId: layer.id,
              layerName: layer.name,
              traitId: trait.id,
              traitName: trait.name,
              imageUrl: trait.imageUrl,
              blendMode: layer.blendMode,
              opacity: layer.opacity,
            });
          }
        }
      }

      previews.push({ id: i + 1, traits: nftTraits });
    }

    return previews;
  };

  const generatePreviews = () => {
    const count = parseInt(previewCount) || 5;
    const previews = generateNFTBatch(count);
    setGeneratedPreviews(previews);
  };

  // Load image helper
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Composite a single NFT image
  const compositeNFTImage = async (nft: GeneratedNFT, canvasSize: number = 512): Promise<string | null> => {
    const hasImages = nft.traits.some((t) => t.imageUrl);
    if (!hasImages) return null;

    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Could not get canvas context");

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    for (const trait of nft.traits) {
      if (trait.imageUrl) {
        try {
          const img = await loadImage(trait.imageUrl);
          ctx.save();
          ctx.globalCompositeOperation = trait.blendMode || "source-over";
          ctx.globalAlpha = (trait.opacity ?? 100) / 100;
          ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
          ctx.restore();
        } catch (error) {
          console.warn(`Failed to load image for trait: ${trait.traitName}`, error);
        }
      }
    }

    return canvas.toDataURL("image/png");
  };

  // Export images with metadata
  const exportImagesWithMetadata = async () => {
    const count = Math.min(parseInt(exportCount) || 10, 100); // Limit to 100 for browser
    const hasImages = layers.some((l) => l.traits.some((t) => t.imageUrl));
    
    if (!hasImages) {
      toast.error("No images found. Add images to your traits first.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Generating NFTs...");

    try {
      const nfts = generateNFTBatch(count);
      const results: { id: number; imageDataUrl: string; metadata: NFTMetadata }[] = [];

      for (let i = 0; i < nfts.length; i++) {
        setExportStatus(`Compositing image ${i + 1} of ${count}...`);
        setExportProgress(((i + 1) / count) * 80);

        const imageDataUrl = await compositeNFTImage(nfts[i]);
        if (imageDataUrl) {
          results.push({
            id: nfts[i].id,
            imageDataUrl,
            metadata: nftToMetadata(nfts[i]),
          });
        }

        // Small delay to prevent browser freeze
        await new Promise((r) => setTimeout(r, 10));
      }

      setExportStatus("Preparing download...");
      setExportProgress(90);

      // Create export package
      const exportPackage = {
        collection: {
          name: collectionName,
          description: collectionDescription,
          total_generated: results.length,
          generated_at: new Date().toISOString(),
        },
        nfts: results.map((r) => ({
          id: r.id,
          metadata: r.metadata,
          image_data: r.imageDataUrl,
        })),
      };

      const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collectionName.toLowerCase().replace(/\s+/g, "-")}-full-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportStatus("Complete!");
      toast.success(`Exported ${results.length} NFTs with images and metadata`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus("");
      }, 1500);
    }
  };

  // Download individual images
  const downloadIndividualImages = async () => {
    const count = Math.min(parseInt(exportCount) || 10, 20); // Limit to 20 for individual downloads
    const hasImages = layers.some((l) => l.traits.some((t) => t.imageUrl));
    
    if (!hasImages) {
      toast.error("No images found. Add images to your traits first.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Generating images...");

    try {
      const nfts = generateNFTBatch(count);

      for (let i = 0; i < nfts.length; i++) {
        setExportStatus(`Downloading image ${i + 1} of ${count}...`);
        setExportProgress(((i + 1) / count) * 100);

        const imageDataUrl = await compositeNFTImage(nfts[i]);
        if (imageDataUrl) {
          const link = document.createElement("a");
          link.download = `${collectionName.toLowerCase().replace(/\s+/g, "-")}-${nfts[i].id}.png`;
          link.href = imageDataUrl;
          link.click();
          
          // Delay between downloads
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      toast.success(`Downloaded ${count} NFT images`);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Download failed. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportStatus("");
    }
  };

  // Convert generated NFT to ERC-721 metadata format
  const nftToMetadata = (nft: GeneratedNFT, baseImageUri: string = ""): NFTMetadata => {
    return {
      name: `${collectionName} #${nft.id}`,
      description: collectionDescription || `${collectionName} NFT #${nft.id}`,
      image: baseImageUri ? `${baseImageUri}/${nft.id}.png` : `ipfs://YOUR_CID/${nft.id}.png`,
      attributes: nft.traits.map((trait) => ({
        trait_type: trait.layerName,
        value: trait.traitName,
      })),
    };
  };

  // Export single metadata JSON
  const exportSingleMetadata = (nft: GeneratedNFT) => {
    const metadata = nftToMetadata(nft);
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nft.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported metadata for NFT #${nft.id}`);
  };

  // Export all metadata as a zip-like bundle (individual files in a folder structure)
  const exportAllMetadata = () => {
    const count = parseInt(exportCount) || parseInt(totalSupply) || 100;
    const nfts = generateNFTBatch(count);
    
    // Create metadata array
    const allMetadata = nfts.map((nft) => nftToMetadata(nft));
    
    // Export as single JSON file with all metadata
    const exportData = {
      name: collectionName,
      description: collectionDescription,
      total_supply: count,
      generated_at: new Date().toISOString(),
      metadata: allMetadata,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collectionName.toLowerCase().replace(/\s+/g, "-")}-metadata.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${count} NFT metadata files`);
  };

  // Export individual metadata files (for IPFS folder upload)
  const exportIndividualFiles = () => {
    const count = parseInt(exportCount) || parseInt(totalSupply) || 100;
    const nfts = generateNFTBatch(count);
    
    // Create a downloadable text file with instructions
    const metadataFiles: { filename: string; content: NFTMetadata }[] = nfts.map((nft) => ({
      filename: `${nft.id}.json`,
      content: nftToMetadata(nft),
    }));

    // Export as a single file with array of all metadata for easy parsing
    const exportData = metadataFiles.map((f) => ({
      filename: f.filename,
      ...f.content,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collectionName.toLowerCase().replace(/\s+/g, "-")}-individual-metadata.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${count} individual metadata entries`);
  };

  // Calculate rarity statistics
  const rarityStats = useMemo(() => {
    const stats: { layer: string; trait: string; rarity: number }[] = [];
    layers.forEach((layer) => {
      const totalRarity = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
      layer.traits.forEach((trait) => {
        const effectiveRarity = totalRarity > 0 ? (trait.rarity / totalRarity) * 100 : 0;
        const layerMultiplier = layer.isOptional ? layer.optionalChance / 100 : 1;
        stats.push({
          layer: layer.name,
          trait: trait.name,
          rarity: effectiveRarity * layerMultiplier,
        });
      });
    });
    return stats.sort((a, b) => a.rarity - b.rarity);
  }, [layers]);

  const rareTraits = rarityStats.slice(0, 5);

  // Check if any layer has images
  const hasAnyImages = layers.some((l) => l.traits.some((t) => t.imageUrl));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Generation Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          Preview how your NFTs will be generated with current rules
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{layers.length}</p>
            <p className="text-xs text-muted-foreground">Layers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">
              {layers.reduce((sum, l) => sum + l.traits.length, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total Traits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{rules.length}</p>
            <p className="text-xs text-muted-foreground">Rules</p>
          </CardContent>
        </Card>
      </div>

      {/* Potential Combinations */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Combination Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Supply</span>
            <span className="font-medium">{totalSupply} NFTs</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Unique Combinations</span>
            <span className="font-medium">
              {layers.reduce(
                (acc, l) => acc * Math.max(l.traits.length, 1),
                1
              ).toLocaleString()}+
            </span>
          </div>
          {rareTraits.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Rarest Traits:
              </p>
              <div className="flex flex-wrap gap-1">
                {rareTraits.map((trait, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {trait.trait} ({trait.rarity.toFixed(1)}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Preview Section */}
      <Tabs defaultValue={hasAnyImages ? "visual" : "text"} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text" className="gap-2">
            <Shuffle className="w-4 h-4" />
            Text Preview
          </TabsTrigger>
          <TabsTrigger value="visual" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Visual Preview
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-4 space-y-4">
          {/* Generate Previews */}
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={previewCount}
              onChange={(e) => setPreviewCount(e.target.value)}
              min="1"
              max="20"
              className="w-20"
            />
            <Button onClick={generatePreviews} className="flex-1">
              <Shuffle className="w-4 h-4 mr-2" />
              Generate {previewCount} Previews
            </Button>
          </div>

          {/* Preview Results */}
          {generatedPreviews.length > 0 && (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {generatedPreviews.map((nft) => (
                  <Card key={nft.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center text-lg font-bold">
                          #{nft.id}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-1">
                            {nft.traits.map((trait, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs"
                              >
                                {trait.layerName}: {trait.traitName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {generatedPreviews.length === 0 && layers.length > 0 && (
            <div className="text-center py-6 border border-dashed rounded-lg">
              <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Click generate to preview NFT combinations
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="visual" className="mt-4">
          <NFTImageCompositor
            layers={layers}
            rules={rules}
          />
        </TabsContent>

        <TabsContent value="export" className="mt-4 space-y-4">
          {/* Export Progress */}
          {isExporting && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">{exportStatus}</span>
                </div>
                <Progress value={exportProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round(exportProgress)}% complete
                </p>
              </CardContent>
            </Card>
          )}

          {/* Export Settings */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Export Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Number of NFTs to Generate</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={exportCount}
                    onChange={(e) => setExportCount(e.target.value)}
                    min="1"
                    max="10000"
                    className="w-32"
                    disabled={isExporting}
                  />
                  <span className="text-sm text-muted-foreground">
                    / {totalSupply} total supply
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image Export */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Images className="w-4 h-4" />
                Export Images + Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate composited NFT images with ERC-721 metadata. Images are rendered from your layer traits.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  onClick={exportImagesWithMetadata} 
                  disabled={isExporting || !hasAnyImages}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderArchive className="w-4 h-4" />
                  )}
                  Full Export (Images + JSON)
                </Button>
                <Button 
                  onClick={downloadIndividualImages} 
                  variant="outline"
                  disabled={isExporting || !hasAnyImages}
                  className="gap-2"
                >
                  <Images className="w-4 h-4" />
                  Download Images Only
                </Button>
              </div>

              {!hasAnyImages && (
                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                  ⚠️ Add images to your traits to enable image export
                </p>
              )}

              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">
                  <strong>Full Export:</strong> JSON file with all metadata + embedded base64 images (up to 100 NFTs)
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Download Images:</strong> Individual PNG files downloaded to your device (up to 20)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Metadata Only Export */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                Export Metadata Only
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Export ERC-721 compatible metadata JSON without images. Use when you have images hosted elsewhere.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button onClick={exportAllMetadata} variant="outline" disabled={isExporting} className="gap-2">
                  <Package className="w-4 h-4" />
                  Collection Bundle
                </Button>
                <Button onClick={exportIndividualFiles} variant="outline" disabled={isExporting} className="gap-2">
                  <FileJson className="w-4 h-4" />
                  Individual Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sample Metadata Preview */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Sample Metadata Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {layers.length > 0 && layers.some((l) => l.traits.length > 0) ? (
                <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto max-h-48">
                  {JSON.stringify(
                    nftToMetadata(generateNFTBatch(1)[0] || { id: 1, traits: [] }),
                    null,
                    2
                  )}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add layers and traits to preview metadata format
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
