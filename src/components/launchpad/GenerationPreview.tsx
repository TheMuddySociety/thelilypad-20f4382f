import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shuffle, Eye, Download, Sparkles, Info, Image as ImageIcon } from "lucide-react";
import { Layer, Trait } from "./LayerManager";
import { TraitRule, RuleType } from "./TraitRulesManager";
import { NFTImageCompositor } from "./NFTImageCompositor";

interface GenerationPreviewProps {
  layers: Layer[];
  rules: TraitRule[];
  totalSupply: string;
}

interface GeneratedNFT {
  id: number;
  traits: { layerId: string; layerName: string; traitId: string; traitName: string }[];
}

export function GenerationPreview({
  layers,
  rules,
  totalSupply,
}: GenerationPreviewProps) {
  const [previewCount, setPreviewCount] = useState("5");
  const [generatedPreviews, setGeneratedPreviews] = useState<GeneratedNFT[]>([]);

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

  const generatePreviews = () => {
    const count = parseInt(previewCount) || 5;
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
            });
          }
        }
      }

      previews.push({ id: i + 1, traits: nftTraits });
    }

    setGeneratedPreviews(previews);
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text" className="gap-2">
            <Shuffle className="w-4 h-4" />
            Text Preview
          </TabsTrigger>
          <TabsTrigger value="visual" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Visual Preview
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
      </Tabs>
    </div>
  );
}
