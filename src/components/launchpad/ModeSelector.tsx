import React from "react";
import { motion } from "framer-motion";
import { FolderOpen, Layers, Sparkles, Zap, Leaf } from "lucide-react";

interface ModeSelectorProps {
    mode: "basic" | "advanced";
    onModeChange: (mode: "basic" | "advanced") => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
    return (
        <div className="space-y-8">
            {/* Header with Lily Pad branding */}
            <div className="text-center space-y-3">
                <div className="flex justify-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="relative"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg glow-primary">
                            <Leaf className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-primary" />
                        </div>
                    </motion.div>
                </div>
                <h2 className="text-2xl font-bold gradient-text">Choose Your Launch Mode</h2>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Select how you want to create your collection on The Lily Pad
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Basic Mode Card */}
                <motion.button
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onModeChange("basic")}
                    className={`relative p-6 rounded-2xl text-left transition-all overflow-hidden ${mode === "basic"
                            ? "bg-gradient-to-br from-primary/20 to-accent/10 border-2 border-primary shadow-lg glow-primary"
                            : "glass-card border border-border/50 hover:border-primary/50"
                        }`}
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

                    {mode === "basic" && (
                        <motion.div
                            layoutId="mode-indicator"
                            className="absolute top-4 right-4 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                        >
                            Selected
                        </motion.div>
                    )}

                    <div className="relative">
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`p-4 rounded-xl ${mode === "basic" ? "bg-primary/20" : "bg-muted"}`}>
                                <FolderOpen className={`w-7 h-7 ${mode === "basic" ? "text-primary" : "text-foreground"}`} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Basic</h3>
                                <p className="text-sm text-muted-foreground">Quick & Easy Launch</p>
                            </div>
                        </div>

                        <ul className="space-y-3 mb-5">
                            {[
                                { icon: Zap, text: "Upload pre-made assets" },
                                { icon: Zap, text: "5 minute setup" },
                                { icon: Zap, text: "No design skills required" },
                            ].map((item, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-3 text-sm"
                                >
                                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                                        <item.icon className="w-3 h-3 text-primary" />
                                    </div>
                                    <span className="text-foreground">{item.text}</span>
                                </motion.li>
                            ))}
                        </ul>

                        <div className="pt-4 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                                <strong className="text-foreground">Best for:</strong> Artists with finished artwork
                            </p>
                        </div>
                    </div>
                </motion.button>

                {/* Advanced Mode Card */}
                <motion.button
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onModeChange("advanced")}
                    className={`relative p-6 rounded-2xl text-left transition-all overflow-hidden ${mode === "advanced"
                            ? "bg-gradient-to-br from-accent/20 to-primary/10 border-2 border-accent shadow-lg"
                            : "glass-card border border-border/50 hover:border-accent/50"
                        }`}
                    style={mode === "advanced" ? { boxShadow: "0 0 40px hsl(160 70% 35% / 0.3)" } : {}}
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

                    {mode === "advanced" && (
                        <motion.div
                            layoutId="mode-indicator"
                            className="absolute top-4 right-4 px-2 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium"
                        >
                            Selected
                        </motion.div>
                    )}

                    <div className="relative">
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`p-4 rounded-xl ${mode === "advanced" ? "bg-accent/20" : "bg-muted"}`}>
                                <Layers className={`w-7 h-7 ${mode === "advanced" ? "text-accent" : "text-foreground"}`} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Advanced</h3>
                                <p className="text-sm text-muted-foreground">Full Creative Control</p>
                            </div>
                        </div>

                        <ul className="space-y-3 mb-5">
                            {[
                                { icon: Sparkles, text: "Import trait layers" },
                                { icon: Sparkles, text: "Configure rarity %" },
                                { icon: Sparkles, text: "Generate unique combos" },
                            ].map((item, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-3 text-sm"
                                >
                                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                                        <item.icon className="w-3 h-3 text-accent" />
                                    </div>
                                    <span className="text-foreground">{item.text}</span>
                                </motion.li>
                            ))}
                        </ul>

                        <div className="pt-4 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                                <strong className="text-foreground">Best for:</strong> Generative PFP projects
                            </p>
                        </div>
                    </div>
                </motion.button>
            </div>

            {/* Bottom hint */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-xs text-muted-foreground"
            >
                You can switch modes at any time before deployment
            </motion.p>
        </div>
    );
}
