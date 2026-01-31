import React from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layer, LayerTrait } from "./LayerManager";
import { Sparkles, Star, Crown, Gem, Percent, RefreshCw, Equal } from "lucide-react";

interface TraitRarityEditorProps {
    layers: Layer[];
    onLayersChange: (layers: Layer[]) => void;
}

// Rarity tiers with Lily Pad styling
const getRarityTier = (rarity: number) => {
    if (rarity <= 5) return {
        label: "Legendary",
        color: "text-amber-500",
        bgColor: "bg-amber-500/20",
        borderColor: "border-amber-500/30",
        icon: Crown
    };
    if (rarity <= 15) return {
        label: "Epic",
        color: "text-purple-500",
        bgColor: "bg-purple-500/20",
        borderColor: "border-purple-500/30",
        icon: Gem
    };
    if (rarity <= 30) return {
        label: "Rare",
        color: "text-blue-500",
        bgColor: "bg-blue-500/20",
        borderColor: "border-blue-500/30",
        icon: Star
    };
    return {
        label: "Common",
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        borderColor: "border-border",
        icon: Sparkles
    };
};

export function TraitRarityEditor({ layers, onLayersChange }: TraitRarityEditorProps) {
    const updateTraitRarity = (layerId: string, traitId: string, rarity: number) => {
        onLayersChange(
            layers.map((layer) => {
                if (layer.id !== layerId) return layer;

                return {
                    ...layer,
                    traits: layer.traits.map((trait) =>
                        trait.id === traitId ? { ...trait, rarity } : trait
                    ),
                };
            })
        );
    };

    // Normalize rarities to sum to 100 for a layer
    const normalizeLayer = (layerId: string) => {
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return;

        const total = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
        if (total === 0) return;

        onLayersChange(
            layers.map((l) => {
                if (l.id !== layerId) return l;
                return {
                    ...l,
                    traits: l.traits.map((t) => ({
                        ...t,
                        rarity: Math.round((t.rarity / total) * 100),
                    })),
                };
            })
        );
    };

    // Set all traits in a layer to equal rarity
    const equalizeLayer = (layerId: string) => {
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return;

        const equalRarity = Math.round(100 / layer.traits.length);

        onLayersChange(
            layers.map((l) => {
                if (l.id !== layerId) return l;
                return {
                    ...l,
                    traits: l.traits.map((t) => ({
                        ...t,
                        rarity: equalRarity,
                    })),
                };
            })
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                        <Percent className="w-6 h-6 text-primary" />
                    </div>
                </div>
                <h3 className="text-xl font-bold gradient-text">Configure Trait Rarity</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Set how rare each trait should be. Lower percentage = more rare and valuable.
                </p>
            </div>

            {/* Rarity Legend */}
            <div className="glass-card p-4">
                <div className="flex flex-wrap gap-3 justify-center">
                    {[
                        { label: "Legendary", color: "bg-amber-500/20 text-amber-500 border-amber-500/30", range: "1-5%" },
                        { label: "Epic", color: "bg-purple-500/20 text-purple-500 border-purple-500/30", range: "6-15%" },
                        { label: "Rare", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", range: "16-30%" },
                        { label: "Common", color: "bg-muted text-muted-foreground border-border", range: "31%+" },
                    ].map((tier) => (
                        <Badge key={tier.label} variant="outline" className={`${tier.color} px-3 py-1`}>
                            {tier.label} ({tier.range})
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Layers */}
            <div className="space-y-6">
                {layers.filter((l) => l.visible).map((layer, layerIndex) => {
                    const totalRarity = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
                    const isBalanced = totalRarity >= 95 && totalRarity <= 105;

                    return (
                        <motion.div
                            key={layer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: layerIndex * 0.1 }}
                            className="glass-card overflow-hidden"
                        >
                            {/* Layer Header */}
                            <div className="p-4 bg-gradient-to-r from-muted/50 to-transparent border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Badge className="bg-primary/20 text-primary border-primary/30 font-mono">
                                        {layerIndex + 1}
                                    </Badge>
                                    <h4 className="font-semibold text-foreground">{layer.name}</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={isBalanced
                                            ? "text-green-500 border-green-500/30 bg-green-500/10"
                                            : "text-amber-500 border-amber-500/30 bg-amber-500/10"
                                        }
                                    >
                                        Total: {totalRarity}%
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => normalizeLayer(layer.id)}
                                        className="text-xs h-7"
                                    >
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Normalize
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => equalizeLayer(layer.id)}
                                        className="text-xs h-7"
                                    >
                                        <Equal className="w-3 h-3 mr-1" />
                                        Equalize
                                    </Button>
                                </div>
                            </div>

                            {/* Traits */}
                            <div className="p-4 space-y-2 max-h-[280px] overflow-y-auto">
                                {layer.traits.map((trait, traitIndex) => {
                                    const tier = getRarityTier(trait.rarity);
                                    const Icon = tier.icon;

                                    return (
                                        <motion.div
                                            key={trait.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: traitIndex * 0.03 }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border ${tier.borderColor} ${tier.bgColor} transition-colors`}
                                        >
                                            {/* Trait Preview */}
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-card bg-card flex-shrink-0 shadow-sm">
                                                <img
                                                    src={trait.preview}
                                                    alt={trait.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>

                                            {/* Trait Name & Tier */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{trait.name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Icon className={`w-3 h-3 ${tier.color}`} />
                                                    <span className={`text-xs font-medium ${tier.color}`}>{tier.label}</span>
                                                </div>
                                            </div>

                                            {/* Rarity Slider */}
                                            <div className="w-36 flex items-center gap-3">
                                                <Slider
                                                    value={[trait.rarity]}
                                                    onValueChange={([val]) => updateTraitRarity(layer.id, trait.id, val)}
                                                    min={1}
                                                    max={100}
                                                    step={1}
                                                    className="flex-1"
                                                />
                                                <div className={`text-sm font-mono font-bold w-10 text-right ${tier.color}`}>
                                                    {trait.rarity}%
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
