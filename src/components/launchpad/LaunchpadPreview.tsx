import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, ShieldCheck, Coins, Image as ImageIcon, Sparkles, Leaf } from "lucide-react";
import { LaunchpadPhase } from "@/hooks/useSolanaLaunch";
import { useChain } from "@/providers/ChainProvider";
import { SupportedChain, CHAINS } from "@/config/chains";

interface LaunchpadPreviewProps {
    name: string;
    description: string;
    coverImage: string | null;
    itemsAvailable: number;
    phases: LaunchpadPhase[];
    activePhaseIndex: number;
    selectedChain?: SupportedChain;
}

export function LaunchpadPreview({
    name,
    description,
    coverImage,
    itemsAvailable,
    phases,
    activePhaseIndex = 0,
    selectedChain
}: LaunchpadPreviewProps) {
    const { chain: globalChain } = useChain();
    // Use the wizard's selectedChain if provided, otherwise fall back to global chain context
    const chain = selectedChain ? CHAINS[selectedChain] : globalChain;
    const { theme } = chain;

    const activePhase = phases[activePhaseIndex] || phases[0];
    const isLive = activePhase?.startTime && new Date() >= activePhase.startTime;

    return (
        <div className="h-full flex flex-col items-center justify-center p-4">
            {/* Header Label */}
            <div className="flex items-center gap-1.5 mb-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                <Sparkles className="w-3 h-3" style={{ color: theme.primaryColor }} />
                <span>Live Preview</span>
            </div>

            {/* Compact Preview Card */}
            <div
                className="w-full max-w-[280px] rounded-2xl overflow-hidden glass-card border-2 shadow-lg"
                style={{
                    borderColor: theme.cardBorder,
                    boxShadow: `0 0 20px ${theme.glowColor}15`
                }}
            >
                {/* Hero Image - Compact */}
                <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-muted to-card overflow-hidden">
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt="Collection Preview"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 gap-2">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Leaf className="w-6 h-6 text-primary/50" />
                            </div>
                            <span className="text-[10px]">Cover Image</span>
                        </div>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                        <Badge className="bg-card/80 backdrop-blur-sm border border-border text-foreground text-[10px] h-5 px-1.5">
                            {itemsAvailable} Items
                        </Badge>
                        {activePhase?.gatekeeper && (
                            <Badge
                                className="backdrop-blur-sm text-[10px] h-5 px-1.5"
                                style={{
                                    backgroundColor: `${theme.primaryColor}20`,
                                    color: theme.primaryColor,
                                    borderColor: `${theme.primaryColor}30`
                                }}
                            >
                                <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Protected
                            </Badge>
                        )}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${isLive
                            ? "bg-green-500/20 text-green-500 border border-green-500/30"
                            : "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
                            {isLive ? "Live" : "Soon"}
                        </div>
                    </div>
                </div>

                {/* Content - Compact */}
                <div className="p-3 space-y-3">
                    {/* Title & Description */}
                    <div className="space-y-1">
                        <h2 className="text-sm font-bold text-foreground tracking-tight line-clamp-1">
                            {name || "Untitled Collection"}
                        </h2>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {description || "Your collection description will appear here..."}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-foreground font-medium">Minted</span>
                            <span className="text-muted-foreground">0/{itemsAvailable}</span>
                        </div>
                        <Progress value={3} className="h-1.5" />
                    </div>

                    {/* Phase Info - Compact */}
                    <div className="p-2 rounded-lg bg-muted/50 border border-border space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{activePhase?.id || "Public"} Phase</span>
                            {activePhase?.endTime && (
                                <span className="flex items-center text-[9px] text-amber-500">
                                    <Clock className="w-2.5 h-2.5 mr-0.5" /> 24h left
                                </span>
                            )}
                        </div>
                        <div className="flex items-center text-base font-bold text-foreground">
                            <Coins className="w-3.5 h-3.5 mr-1.5" style={{ color: theme.primaryColor }} />
                            {activePhase?.price || 0} {chain.symbol}
                        </div>
                    </div>

                    {/* Action Button - Compact */}
                    <Button
                        size="sm"
                        className="w-full h-8 text-xs font-bold text-white"
                        style={{
                            background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})`
                        }}
                    >
                        Mint with {chain.symbol}
                    </Button>
                </div>
            </div>

            {/* Hint Text */}
            <p className="mt-3 text-[10px] text-muted-foreground text-center max-w-[240px]">
                This is how your mint page will look to collectors
            </p>
        </div>
    );
}
