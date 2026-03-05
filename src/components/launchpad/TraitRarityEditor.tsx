import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Layer } from "./LayerManager";
import {
    Sparkles, Star, Crown, Gem, Percent, RefreshCw, Equal,
    ChevronDown, ChevronUp, Lock, Unlock, Settings2, BarChart3,
    Info,
} from "lucide-react";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TraitRarityEditorProps {
    layers: Layer[];
    onLayersChange: (layers: Layer[]) => void;
}

const getRarityTier = (percentage: number) => {
    if (percentage <= 5) return { label: "Legendary", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", barColor: "bg-amber-500", icon: Crown };
    if (percentage <= 15) return { label: "Epic", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", barColor: "bg-purple-500", icon: Gem };
    if (percentage <= 30) return { label: "Rare", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", barColor: "bg-blue-500", icon: Star };
    return { label: "Common", color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border", barColor: "bg-muted-foreground/60", icon: Sparkles };
};

export function TraitRarityEditor({ layers, onLayersChange }: TraitRarityEditorProps) {
    const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(layers.map(l => l.id)));
    const [lockedTraits, setLockedTraits] = useState<Set<string>>(new Set());

    // Toggle layer expansion
    const toggleLayer = (layerId: string) => {
        setExpandedLayers(prev => {
            const next = new Set(prev);
            next.has(layerId) ? next.delete(layerId) : next.add(layerId);
            return next;
        });
    };

    // Toggle trait lock (locked traits don't change during equalize/normalize)
    const toggleLock = (traitId: string) => {
        setLockedTraits(prev => {
            const next = new Set(prev);
            next.has(traitId) ? next.delete(traitId) : next.add(traitId);
            return next;
        });
    };

    // Calculate effective percentage for a trait within its layer
    const getEffectivePercentage = (layer: Layer, traitRarity: number) => {
        const total = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
        if (total === 0) return 0;
        const layerMultiplier = layer.isOptional ? (layer.optionalChance ?? 100) / 100 : 1;
        return (traitRarity / total) * 100 * layerMultiplier;
    };

    // Update a single trait's rarity — redistributes remaining % to unlocked traits
    const updateTraitRarity = (layerId: string, traitId: string, newRarity: number) => {
        onLayersChange(layers.map((layer) => {
            if (layer.id !== layerId) return layer;
            return { ...layer, traits: layer.traits.map((t) => t.id === traitId ? { ...t, rarity: Math.max(1, newRarity) } : t) };
        }));
    };

    // Set a specific percentage for a trait and auto-redistribute the rest
    const setTraitPercentage = (layerId: string, traitId: string, targetPercent: number) => {
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;

        const clampedPercent = Math.max(0.5, Math.min(99, targetPercent));

        // Calculate total weight to determine what weight gives us the target %
        const otherTraits = layer.traits.filter(t => t.id !== traitId);
        const otherTotal = otherTraits.reduce((sum, t) => sum + t.rarity, 0);

        // targetPercent/100 = newRarity / (newRarity + otherTotal)
        // solving: newRarity = (targetPercent * otherTotal) / (100 - targetPercent)
        const newRarity = Math.max(1, Math.round((clampedPercent * otherTotal) / (100 - clampedPercent)));

        onLayersChange(layers.map((l) => {
            if (l.id !== layerId) return l;
            return { ...l, traits: l.traits.map((t) => t.id === traitId ? { ...t, rarity: newRarity } : t) };
        }));
    };

    // Normalize so total = 100
    const normalizeLayer = (layerId: string) => {
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return;
        const total = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
        if (total === 0) return;

        // Keep locked traits' weights, redistribute to unlocked
        const lockedWeight = layer.traits.filter(t => lockedTraits.has(t.id)).reduce((sum, t) => sum + t.rarity, 0);
        const lockedPercent = (lockedWeight / total) * 100;
        const remainingPercent = 100 - lockedPercent;
        const unlockedTraits = layer.traits.filter(t => !lockedTraits.has(t.id));
        const unlockedTotal = unlockedTraits.reduce((sum, t) => sum + t.rarity, 0);

        onLayersChange(layers.map((l) => {
            if (l.id !== layerId) return l;
            return {
                ...l,
                traits: l.traits.map((t) => {
                    if (lockedTraits.has(t.id)) {
                        return { ...t, rarity: Math.round((t.rarity / total) * 100) };
                    }
                    if (unlockedTotal === 0) return { ...t, rarity: Math.round(remainingPercent / unlockedTraits.length) };
                    return { ...t, rarity: Math.max(1, Math.round((t.rarity / unlockedTotal) * remainingPercent)) };
                })
            };
        }));
    };

    // Equalize unlocked traits
    const equalizeLayer = (layerId: string) => {
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return;

        const total = layer.traits.reduce((sum, t) => sum + t.rarity, 0) || 100;
        const lockedWeight = layer.traits.filter(t => lockedTraits.has(t.id)).reduce((sum, t) => sum + t.rarity, 0);
        const lockedPercent = total > 0 ? (lockedWeight / total) * 100 : 0;
        const unlockedTraits = layer.traits.filter(t => !lockedTraits.has(t.id));
        const remainingPercent = 100 - lockedPercent;
        const equalWeight = unlockedTraits.length > 0 ? Math.round(remainingPercent / unlockedTraits.length) : 0;

        onLayersChange(layers.map((l) => {
            if (l.id !== layerId) return l;
            return {
                ...l,
                traits: l.traits.map((t) => {
                    if (lockedTraits.has(t.id)) return t;
                    return { ...t, rarity: Math.max(1, equalWeight) };
                })
            };
        }));
    };

    // Preset: make one trait legendary (5%), distribute rest equally
    const makeTraitLegendary = (layerId: string, traitId: string) => {
        setTraitPercentage(layerId, traitId, 3);
    };

    // Preset: make one trait rare (12%)
    const makeTraitRare = (layerId: string, traitId: string) => {
        setTraitPercentage(layerId, traitId, 12);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="text-center space-y-1">
                <div className="flex justify-center mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                        <Percent className="w-5 h-5 text-primary" />
                    </div>
                </div>
                <h3 className="text-sm font-bold gradient-text">Configure Trait Rarity</h3>
                <p className="text-[10px] text-muted-foreground">
                    Set the % chance each trait appears in your collection
                </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-1.5 justify-center">
                {[
                    { label: "Legendary", color: "bg-amber-500/15 text-amber-500 border-amber-500/20", range: "≤5%" },
                    { label: "Epic", color: "bg-purple-500/15 text-purple-500 border-purple-500/20", range: "6-15%" },
                    { label: "Rare", color: "bg-blue-500/15 text-blue-500 border-blue-500/20", range: "16-30%" },
                    { label: "Common", color: "bg-muted text-muted-foreground border-border", range: ">30%" },
                ].map((tier) => (
                    <Badge key={tier.label} variant="outline" className={`${tier.color} text-[9px] h-5 px-1.5 gap-1`}>
                        {tier.label}
                        <span className="opacity-60">{tier.range}</span>
                    </Badge>
                ))}
            </div>

            {/* Layers */}
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {layers.filter((l) => l.visible).map((layer, layerIndex) => {
                    const total = layer.traits.reduce((sum, t) => sum + t.rarity, 0);
                    const isExpanded = expandedLayers.has(layer.id);

                    return (
                        <motion.div
                            key={layer.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: layerIndex * 0.05 }}
                            className="rounded-xl border border-border/60 bg-card/50 overflow-hidden"
                        >
                            {/* Layer Header */}
                            <button
                                onClick={() => toggleLayer(layer.id)}
                                className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] h-5 px-1.5">
                                        {layerIndex + 1}
                                    </Badge>
                                    <span className="text-xs font-semibold text-foreground">{layer.name}</span>
                                    <Badge variant="outline" className="text-[10px] h-5">
                                        {layer.traits.length} traits
                                    </Badge>
                                    {layer.isOptional && (
                                        <Badge variant="outline" className="text-[10px] h-5 text-amber-500 border-amber-500/30">
                                            Optional {layer.optionalChance ?? 100}%
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded content */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        {/* Layer toolbar */}
                                        <div className="px-3 pb-2 flex items-center gap-2 border-t border-border/50 pt-2">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); normalizeLayer(layer.id); }}
                                                            className="h-6 px-2 text-[10px] gap-1"
                                                        >
                                                            <RefreshCw className="w-2.5 h-2.5" />
                                                            Normalize
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="text-xs max-w-xs">
                                                        Adjust weights so percentages total 100%. Locked traits keep their values.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); equalizeLayer(layer.id); }}
                                                            className="h-6 px-2 text-[10px] gap-1"
                                                        >
                                                            <Equal className="w-2.5 h-2.5" />
                                                            Equalize
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="text-xs max-w-xs">
                                                        Set all unlocked traits to equal weight.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <div className="flex-1" />

                                            <span className={cn(
                                                "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                                total >= 95 && total <= 105
                                                    ? "text-green-500 bg-green-500/10"
                                                    : "text-amber-500 bg-amber-500/10"
                                            )}>
                                                Σ {total}
                                            </span>
                                        </div>

                                        {/* Optional layer chance */}
                                        {layer.isOptional && (
                                            <div className="px-3 pb-2">
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                                        This layer appears in {layer.optionalChance ?? 100}% of NFTs. Trait percentages below are relative to when this layer IS included.
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Trait list */}
                                        <div className="px-3 pb-3 space-y-1.5 max-h-[300px] overflow-y-auto">
                                            {layer.traits.map((trait) => {
                                                const effectivePercent = getEffectivePercentage(layer, trait.rarity);
                                                const tier = getRarityTier(effectivePercent);
                                                const Icon = tier.icon;
                                                const isLocked = lockedTraits.has(trait.id);

                                                return (
                                                    <div
                                                        key={trait.id}
                                                        className={cn(
                                                            "relative flex items-center gap-2.5 p-2 rounded-lg border transition-all",
                                                            tier.border, tier.bg,
                                                            isLocked && "ring-1 ring-primary/30"
                                                        )}
                                                    >
                                                        {/* Trait image */}
                                                        <div className="w-9 h-9 rounded-lg border border-card bg-card flex-shrink-0 overflow-hidden">
                                                            <img
                                                                src={trait.preview || trait.imageUrl}
                                                                alt={trait.name}
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>

                                                        {/* Trait info */}
                                                        <div className="flex-1 min-w-0 space-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="text-[11px] font-medium text-foreground truncate">
                                                                    {trait.name}
                                                                </p>
                                                                <Icon className={cn("w-3 h-3 shrink-0", tier.color)} />
                                                                <span className={cn("text-[9px] shrink-0", tier.color)}>
                                                                    {tier.label}
                                                                </span>
                                                            </div>

                                                            {/* Percentage bar + slider */}
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-background/60 rounded-full overflow-hidden">
                                                                    <motion.div
                                                                        className={cn("h-full rounded-full", tier.barColor)}
                                                                        initial={false}
                                                                        animate={{ width: `${Math.min(effectivePercent, 100)}%` }}
                                                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                                                    />
                                                                </div>

                                                                <Slider
                                                                    value={[trait.rarity]}
                                                                    onValueChange={([val]) => updateTraitRarity(layer.id, trait.id, val)}
                                                                    min={1}
                                                                    max={100}
                                                                    step={1}
                                                                    className="w-16"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Percentage input */}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <Input
                                                                type="number"
                                                                value={Math.round(effectivePercent * 10) / 10}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (!isNaN(val)) setTraitPercentage(layer.id, trait.id, val);
                                                                }}
                                                                min={0.5}
                                                                max={99}
                                                                step={0.5}
                                                                className="w-14 h-6 text-[10px] text-right font-mono px-1.5 bg-background/60"
                                                            />
                                                            <span className={cn("text-[10px] font-bold", tier.color)}>%</span>
                                                        </div>

                                                        {/* Lock button */}
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button
                                                                        onClick={() => toggleLock(trait.id)}
                                                                        className={cn(
                                                                            "p-0.5 rounded transition-colors shrink-0",
                                                                            isLocked
                                                                                ? "text-primary hover:text-primary/80"
                                                                                : "text-muted-foreground/40 hover:text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        {isLocked ? (
                                                                            <Lock className="w-3 h-3" />
                                                                        ) : (
                                                                            <Unlock className="w-3 h-3" />
                                                                        )}
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="left" className="text-xs">
                                                                    {isLocked ? "Unlock trait (will change during Equalize)" : "Lock trait (keeps value during Equalize/Normalize)"}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        {/* Quick presets (on hover) */}
                                                        <div className="absolute right-8 top-1 opacity-0 group-hover:opacity-100 hidden sm:flex gap-0.5">
                                                            {/* These are shown via the context menu or can be expanded later */}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Layer summary bar */}
                                        <div className="px-3 pb-3">
                                            <div className="h-3 rounded-full overflow-hidden flex bg-background/40 border border-border/40">
                                                {layer.traits.map((trait, idx) => {
                                                    const percent = getEffectivePercentage(layer, trait.rarity);
                                                    const tier = getRarityTier(percent);
                                                    return (
                                                        <TooltipProvider key={trait.id}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <motion.div
                                                                        className={cn(
                                                                            "h-full transition-colors cursor-pointer hover:brightness-125",
                                                                            tier.barColor,
                                                                            idx > 0 && "border-l border-background/60"
                                                                        )}
                                                                        initial={false}
                                                                        animate={{ width: `${percent}%` }}
                                                                        transition={{ duration: 0.3 }}
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs">
                                                                    <strong>{trait.name}</strong>: {Math.round(percent * 10) / 10}%
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quick presets */}
            {layers.length > 0 && (
                <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Settings2 className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-semibold text-foreground">Quick Tips</span>
                    </div>
                    <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                        <li><strong>Type a %</strong> directly in the input box to set an exact appearance rate</li>
                        <li><strong>Lock</strong> a trait to keep its % when using Equalize or Normalize</li>
                        <li><strong>Equalize</strong> sets all unlocked traits to equal weight</li>
                        <li><strong>Normalize</strong> scales weights so the total = 100</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
