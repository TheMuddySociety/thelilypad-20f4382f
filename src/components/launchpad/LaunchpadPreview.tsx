import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, ShieldCheck, Coins, Image as ImageIcon } from "lucide-react";
import { LaunchpadPhase } from "@/hooks/useSolanaLaunch";
import { formatDistanceToNow } from "date-fns";

interface LaunchpadPreviewProps {
    name: string;
    description: string;
    coverImage: string | null;
    itemsAvailable: number;
    phases: LaunchpadPhase[];
    activePhaseIndex: number;
}

export function LaunchpadPreview({
    name,
    description,
    coverImage,
    itemsAvailable,
    phases,
    activePhaseIndex = 0
}: LaunchpadPreviewProps) {
    const activePhase = phases[activePhaseIndex] || phases[0];
    const isLive = activePhase?.startTime && new Date() >= activePhase.startTime;

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-xl border-l border-white/5">
            <div className="mb-4 text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Live Preview</div>

            <div className="w-full max-w-sm rounded-[2rem] overflow-hidden bg-[#0A0A0A] border border-white/10 shadow-2xl shadow-purple-500/20 ring-1 ring-white/5">
                {/* Hero Image */}
                <div className="relative aspect-square w-full bg-gradient-to-br from-gray-900 to-black group overflow-hidden">
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt="Collection Preview"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                            <ImageIcon className="w-16 h-16" />
                        </div>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        <Badge className="bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black/70">
                            {itemsAvailable} Items
                        </Badge>
                        {activePhase?.gatekeeper && (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border border-blue-500/20 backdrop-blur-md">
                                <ShieldCheck className="w-3 h-3 mr-1" /> Bot Protected
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white tracking-tight line-clamp-1">{name || "Untitled Collection"}</h2>
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5">
                                <div className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
                                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                                    {isLive ? "Live" : "Upcoming"}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {description || "No description provided."}
                        </p>
                    </div>

                    {/* Progress Bar (Mock) */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-white">Total Minted</span>
                            <span className="text-muted-foreground">0% (0/{itemsAvailable})</span>
                        </div>
                        <Progress value={5} className="h-2 bg-secondary" />
                    </div>

                    {/* Active Phase Info */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">{activePhase?.id || "Public"} Phase</span>
                            {activePhase?.endTime && (
                                <span className="flex items-center text-xs text-orange-400">
                                    <Clock className="w-3 h-3 mr-1" /> Ends in 24h
                                </span>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-2xl font-bold text-white">
                            <div className="flex items-center">
                                <Coins className="w-5 h-5 mr-2 text-yellow-500" />
                                {activePhase?.price || 0} SOL
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button className="w-full h-12 text-lg font-bold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-purple-500/25 transition-all">
                        Mint Now
                    </Button>
                </div>
            </div>
        </div>
    );
}
