import React from "react";
import { Sparkles, Shield, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Phase } from "./types";

interface CollectionPhasesCardProps {
    phases: Phase[];
    activePhase: Phase | null;
    setActivePhase: (phase: Phase) => void;
    currency: string;
}

export const CollectionPhasesCard: React.FC<CollectionPhasesCardProps> = ({
    phases,
    activePhase,
    setActivePhase,
    currency,
}) => {
    return (
        <Card className="glass-card shadow-lg border-border/50">
            <CardHeader>
                <CardTitle>Mint Phases</CardTitle>
                <CardDescription>Track the progress of each mint phase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {phases.length > 0 ? (
                    phases.map((phase) => {
                        const phaseMinted = phase.minted ?? 0;
                        const phaseSupply = phase.supply ?? 0;
                        const phaseProgress = phaseSupply > 0 ? (phaseMinted / phaseSupply) * 100 : 0;
                        const PhaseIcon = phase.requiresAllowlist
                            ? phase.id === "team"
                                ? Shield
                                : Users
                            : Sparkles;
                        const isActive = activePhase?.id === phase.id;

                        return (
                            <div
                                key={phase.id}
                                className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer group ${isActive
                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                        : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                                    }`}
                                onClick={() => setActivePhase(phase)}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:text-primary transition-colors"}`}>
                                            <PhaseIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-lg">{phase.name || phase.id || "Phase"}</span>
                                            {isActive && (
                                                <span className="text-xs text-primary font-medium">Currently Selected</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-primary">
                                            {phase.price === "0" ? "Free" : `${phase.price} ${currency}`}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Max {phase.maxPerWallet ?? 1} per wallet
                                        </span>
                                        <span className="font-medium">
                                            {phaseMinted.toLocaleString()} / {phaseSupply.toLocaleString()}
                                        </span>
                                    </div>
                                    <Progress value={phaseProgress} className="h-2.5" />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-10">
                        <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No mint phases configured</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
