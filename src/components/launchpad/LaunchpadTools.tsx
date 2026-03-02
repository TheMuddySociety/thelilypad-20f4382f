import React from "react";
import { motion } from "framer-motion";
import { ChainLaunchpadConfig } from "@/config/launchpad";
import { Badge } from "@/components/ui/badge";

interface LaunchpadToolsProps {
    config: ChainLaunchpadConfig;
    theme: {
        primaryColor: string;
        secondaryColor: string;
    };
}

export function LaunchpadTools({ config, theme }: LaunchpadToolsProps) {
    if (!config.tools || config.tools.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Chain-Specific Tools</h3>
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}>
                    {config.name} Optimized
                </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3">
                {config.tools.map((tool, idx) => {
                    const Icon = tool.icon;
                    return (
                        <motion.div
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            className="p-3 rounded-lg border border-border bg-card/40 hover:bg-card/60 transition-colors flex items-start gap-3 cursor-default group"
                        >
                            <div className="p-2 rounded-md bg-muted group-hover:bg-muted/80 transition-colors">
                                <Icon className="w-4 h-4" style={{ color: theme.primaryColor }} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium">{tool.name}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {tool.description}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
