import React from "react";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

// Locked to Solana only - Monad support coming soon
export type Platform = "solana";

interface PlatformSwitcherProps {
    selected: Platform;
    onChange?: (platform: Platform) => void;
    className?: string;
}

export const PlatformSwitcher: React.FC<PlatformSwitcherProps> = ({
    selected: _selected,
    onChange: _onChange,
    className,
}) => {
    return (
        <div className={cn("inline-flex items-center p-1 bg-muted rounded-lg border border-border", className)}>
            <div
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
                    "bg-background shadow-sm text-foreground"
                )}
            >
                <Globe className="w-4 h-4 text-green-500" />
                Solana Devnet
            </div>
        </div>
    );
};
