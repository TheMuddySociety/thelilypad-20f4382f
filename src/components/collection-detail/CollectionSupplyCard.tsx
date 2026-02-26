import React from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CollectionSupplyCardProps {
    liveSupply: number;
    totalSupply: number;
    isLivePolling: boolean;
    isRefreshing: boolean;
    handleRefreshSupply: () => void;
    lastUpdated: Date | null;
}

export const CollectionSupplyCard: React.FC<CollectionSupplyCardProps> = ({
    liveSupply,
    totalSupply,
    isLivePolling,
    isRefreshing,
    handleRefreshSupply,
    lastUpdated,
}) => {
    const percentage = totalSupply > 0 ? Math.min((liveSupply / totalSupply) * 100, 100) : 0;

    return (
        <Card className={`glass-card shadow-lg border-primary/20 ${isLivePolling ? 'ring-1 ring-primary/30' : ''}`}>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">Supply Track</CardTitle>
                        {isLivePolling && (
                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Live</span>
                            </div>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-all rounded-full"
                        onClick={handleRefreshSupply}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center mb-6 py-2">
                    <div className="text-5xl font-black text-primary mb-2 tracking-tighter transition-all duration-300">
                        {Math.min(liveSupply, totalSupply).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <span>of</span>
                        <span className="text-foreground">{totalSupply.toLocaleString()}</span>
                        <span>minted</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Progress</span>
                        <span className="text-primary">{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-3 shadow-inner" />
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground font-medium italic">
                        {isLivePolling ? "Auto-updating every 5s" : "Visualizing stored data"}
                    </p>
                    {lastUpdated && (
                        <p className="text-[11px] text-muted-foreground/80">
                            Synced: {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
