import React from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layer } from "./LayerManager";
import { Sparkles, Star, Crown, Gem, Percent, RefreshCw, Equal } from "lucide-react";

interface TraitRarityEditorProps {
    layers: Layer[];
    onLayersChange: (layers: Layer[]) => void;
}

const getRarityTier = (rarity: number) => {
    if (rarity <= 5) return { label: "Legendary", color: "text-amber-500", bg: "bg-amber-500/15", icon: Crown };
    if (rarity <= 15) return { label: "Epic", color: "text-purple-500", bg: "bg-purple-500/15", icon: Gem };
    if (rarity <= 30) return { label: "Rare", color: "text-blue-500", bg: "bg-blue-500/15", icon: Star };
    return { label: "Common", color: "text-muted-foreground", bg: "bg-muted", icon: Sparkles };
};

export function TraitRarityEditor({ layers, onLayersChange }: TraitRarityEditorProps) {
    const updateTraitRarity = (layerId: string, traitId: string, rarity: number) => {
        onLayersChange(layers.map((layer) => {
            if (layer.id !== layerId) return layer;
            return { ...layer, traits: layer.traits.map((t) => t.id === traitId ? { ...t, rarity } : t) };
        }));
    };

    const normalizeLayer = (layerId: string) => {
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return;
        const total = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
        if (total === 0) return;
        onLayersChange(layers.map((l) => {
            if (l.id !== layerId) return l;
            return { ...l, traits: l.traits.map((t) => ({ ...t, rarity: Math.round((t.rarity / total) * 100) })) };
        }));
    };

    const equalizeLayer = (layerId: string) => {
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return;
        const equal = Math.round(100 / layer.traits.length);
        onLayersChange(layers.map((l) => {
            if (l.id !== layerId) return l;
            return { ...l, traits: l.traits.map((t) => ({ ...t, rarity: equal })) };
        }));
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="text-center space-y-1">
                <div className="flex justify-center mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                        <Percent className="w-4 h-4 text-primary" />
                    </div>
                </div>
                <h3 className="text-sm font-bold gradient-text">Configure Trait Rarity</h3>
                <p className="text-[10px] text-muted-foreground">Lower % = more rare</p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-1.5 justify-center">
                {[
                    { label: "Legendary", color: "bg-amber-500/15 text-amber-500 border-amber-500/20", range: "1-5%" },
                    { label: "Epic", color: "bg-purple-500/15 text-purple-500 border-purple-500/20", range: "6-15%" },
                    { label: "Rare", color: "bg-blue-500/15 text-blue-500 border-blue-500/20", range: "16-30%" },
                    { label: "Common", color: "bg-muted text-muted-foreground border-border", range: "31%+" },
                ].map((tier) => (
                    <Badge key={tier.label} variant="outline" className={`${tier.color} text-[9px] h-5 px-1.5`}>
                        {tier.label}
                    </Badge>
                ))}
            </div>

            {/* Layers */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {layers.filter((l) => l.visible).map((layer, layerIndex) => {
                    const total = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
                    const balanced = total >= 95 && total <= 105;

                    return (
                        <motion.div
                            key={layer.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: layerIndex * 0.05 }}
                            className="glass-card overflow-hidden"
                        >
                            {/* Layer Header */}
                            <div className="p-2 bg-muted/30 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] h-5 px-1.5">{layerIndex + 1}</Badge>
                                    <span className="text-xs font-medium text-foreground">{layer.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Badge variant="outline" className={`text-[10px] h-5 ${balanced ? "text-green-500 border-green-500/30" : "text-amber-500 border-amber-500/30"}`}>
                                        {total}%
                                    </Badge>
                                    <Button variant="ghost" size="sm" onClick={() => normalizeLayer(layer.id)} className="h-5 px-1.5 text-[10px]">
                                        <RefreshCw className="w-2.5 h-2.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => equalizeLayer(layer.id)} className="h-5 px-1.5 text-[10px]">
                                        <Equal className="w-2.5 h-2.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Traits */}
                            <div className="p-2 space-y-1 max-h-[180px] overflow-y-auto">
                                {layer.traits.map((trait) => {
                                    const tier = getRarityTier(trait.rarity);
                                    const Icon = tier.icon;

                                    return (
                                        <div key={trait.id} className={`flex items-center gap-2 p-1.5 rounded-lg border border-border/50 ${tier.bg}`}>
                                            <div className="w-8 h-8 rounded border border-card bg-card flex-shrink-0 overflow-hidden">
                                                <img src={trait.preview} alt={trait.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-medium text-foreground truncate">{trait.name}</p>
                                                <div className="flex items-center gap-1">
                                                    <Icon className={`w-2.5 h-2.5 ${tier.color}`} />
                                                    <span className={`text-[9px] ${tier.color}`}>{tier.label}</span>
                                                </div>
                                            </div>
                                            <div className="w-20 flex items-center gap-2">
                                                <Slider
                                                    value={[trait.rarity]}
                                                    onValueChange={([val]) => updateTraitRarity(layer.id, trait.id, val)}
                                                    min={1}
                                                    max={100}
                                                    step={1}
                                                    className="flex-1"
                                                />
                                                <span className={`text-[10px] font-mono font-bold w-7 text-right ${tier.color}`}>{trait.rarity}%</span>
                                            </div>
                                        </div>
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
