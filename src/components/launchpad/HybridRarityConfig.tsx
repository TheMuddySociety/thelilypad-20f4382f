import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { TraitRarityEditor } from "./TraitRarityEditor";
import { type Layer } from "./LayerManager";
import { Sparkles, Hash, Info } from "lucide-react";

interface HybridRarityConfigProps {
    layers: Layer[];
    onLayersChange: (layers: Layer[]) => void;
    totalSupply: string;
    onTotalSupplyChange: (supply: string) => void;
}

export function HybridRarityConfig({
    layers,
    onLayersChange,
    totalSupply,
    onTotalSupplyChange,
}: HybridRarityConfigProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    Rarity & Supply
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Set rarity weights for each trait and define your total collection supply.
                </p>
            </div>

            {/* Supply input */}
            <Card className="border-border/60">
                <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Hash className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <Label className="text-xs font-medium">
                                Total Supply <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                min="1"
                                max="10000"
                                placeholder="e.g. 1000"
                                value={totalSupply}
                                onChange={(e) => onTotalSupplyChange(e.target.value)}
                                className="max-w-[200px]"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                How many unique NFTs to generate (1–10,000)
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rarity editor */}
            <TraitRarityEditor layers={layers} onLayersChange={onLayersChange} />

            {/* Tip */}
            <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="py-3 px-4 flex items-start gap-3">
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-medium">Tip: </span>
                        Lower rarity values make traits more scarce. Use the "Equalize" button
                        to distribute weights evenly, or "Normalize" to rescale all weights to 100%.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
