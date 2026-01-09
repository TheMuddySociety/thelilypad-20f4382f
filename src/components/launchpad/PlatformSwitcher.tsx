import React from "react";
import { cn } from "@/lib/utils";
import { Zap, Globe } from "lucide-react";

export type Platform = "monad" | "solana";

interface PlatformSwitcherProps {
    selected: Platform;
    onChange: (platform: Platform) => void;
    className?: string;
}

export const PlatformSwitcher: React.FC<PlatformSwitcherProps> = ({
    selected,
    onChange,
    className,
}) => {
    return (
        <div className={cn("inline-flex items-center p-1 bg-muted rounded-lg border border-border", className)}>
            <button
                onClick={() => onChange("monad")}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    selected === "monad"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
            >
                <Zap className={cn("w-4 h-4", selected === "monad" && "text-purple-500")} />
                Monad (EVM)
            </button>
            <button
                onClick={() => onChange("solana")}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    selected === "solana"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
            >
                <Globe className={cn("w-4 h-4", selected === "solana" && "text-green-500")} />
                Solana
            </button>
        </div>
    );
};
