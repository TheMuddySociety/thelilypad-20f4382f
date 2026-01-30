import React from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Layer, LayerTrait } from "./LayerManager";
import { Sparkles, Star, Crown, Gem } from "lucide-react";

interface TraitRarityEditorProps {
    layers: Layer[];
    onLayersChange: (layers: Layer[]) => void;
}

// Rarity tiers
const getRarityTier = (rarity: number) => {
    if (rarity <= 5) return { label: "Legendary", color: "text-yellow-400", icon: Crown, bg: "bg-yellow-500/20" };
    if (rarity <= 15) return { label: "Epic", color: "text-purple-400", icon: Gem, bg: "bg-purple-500/20" };
    if (rarity <= 30) return { label: "Rare", color: "text-blue-400", icon: Star, bg: "bg-blue-500/20" };
    return { label: "Common", color: "text-gray-400", icon: Sparkles, bg: "bg-white/10" };
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
            <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-white">Configure Trait Rarity</h3>
                <p className="text-xs text-muted-foreground">
                    Set how rare each trait should be. Lower % = more rare.
                </p>
            </div>

            {/* Rarity Legend */}
            <div className="flex flex-wrap gap-2 justify-center">
                {[
                    { label: "Legendary", color: "bg-yellow-500/20 text-yellow-400", range: "1-5%" },
                    { label: "Epic", color: "bg-purple-500/20 text-purple-400", range: "6-15%" },
                    { label: "Rare", color: "bg-blue-500/20 text-blue-400", range: "16-30%" },
                    { label: "Common", color: "bg-white/10 text-gray-400", range: "31%+" },
                ].map((tier) => (
                    <Badge key={tier.label} variant="outline" className={`${tier.color} border-none`}>
                        {tier.label} ({tier.range})
                    </Badge>
                ))}
            </div>

            {/* Layers */}
            {layers.filter((l) => l.visible).map((layer) => {
                const totalRarity = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
                const isBalanced = totalRarity >= 95 && totalRarity <= 105;

                return (
                    <div key={layer.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-white">{layer.name}</h4>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className={isBalanced ? "text-green-400" : "text-yellow-400"}
                                >
                                    Total: {totalRarity}%
                                </Badge>
                                <button
                                    onClick={() => normalizeLayer(layer.id)}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Normalize
                                </button>
                                <button
                                    onClick={() => equalizeLayer(layer.id)}
                                    className="text-xs text-muted-foreground hover:text-white"
                                >
                                    Equalize
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {layer.traits.map((trait) => {
                                const tier = getRarityTier(trait.rarity);
                                const Icon = tier.icon;

                                return (
                                    <motion.div
                                        key={trait.id}
                                        layout
                                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10"
                                    >
                                        {/* Trait Preview */}
                                        <div className="w-10 h-10 rounded-md overflow-hidden border border-white/10 bg-black/50 flex-shrink-0">
                                            <img
                                                src={trait.preview}
                                                alt={trait.name}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>

                                        {/* Trait Name */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{trait.name}</p>
                                            <div className="flex items-center gap-1">
                                                <Icon className={`w-3 h-3 ${tier.color}`} />
                                                <span className={`text-xs ${tier.color}`}>{tier.label}</span>
                                            </div>
                                        </div>

                                        {/* Rarity Slider */}
                                        <div className="w-32 flex items-center gap-2">
                                            <Slider
                                                value={[trait.rarity]}
                                                onValueChange={([val]) => updateTraitRarity(layer.id, trait.id, val)}
                                                min={1}
                                                max={100}
                                                step={1}
                                                className="flex-1"
                                            />
                                            <span className="text-xs font-mono w-8 text-right text-white">
                                                {trait.rarity}%
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
