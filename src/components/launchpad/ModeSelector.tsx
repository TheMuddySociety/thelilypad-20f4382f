import React from "react";
import { motion } from "framer-motion";
import { FolderOpen, Layers, Sparkles, Zap } from "lucide-react";

interface ModeSelectorProps {
    mode: "basic" | "advanced";
    onModeChange: (mode: "basic" | "advanced") => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Choose Your Launch Mode</h2>
                <p className="text-muted-foreground text-sm">
                    Select how you want to create your collection
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Mode Card */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onModeChange("basic")}
                    className={`relative p-6 rounded-xl border-2 text-left transition-all ${mode === "basic"
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        }`}
                >
                    {mode === "basic" && (
                        <motion.div
                            layoutId="mode-indicator"
                            className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary"
                        />
                    )}

                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-lg ${mode === "basic" ? "bg-primary/20" : "bg-white/10"}`}>
                            <FolderOpen className={`w-6 h-6 ${mode === "basic" ? "text-primary" : "text-white"}`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Basic</h3>
                            <p className="text-xs text-muted-foreground">Quick & Easy</p>
                        </div>
                    </div>

                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span>Upload pre-made assets</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span>5 minute setup</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span>No design skills required</span>
                        </li>
                    </ul>

                    <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-muted-foreground">
                            Best for: Artists with finished artwork, existing collections
                        </p>
                    </div>
                </motion.button>

                {/* Advanced Mode Card */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onModeChange("advanced")}
                    className={`relative p-6 rounded-xl border-2 text-left transition-all ${mode === "advanced"
                            ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        }`}
                >
                    {mode === "advanced" && (
                        <motion.div
                            layoutId="mode-indicator"
                            className="absolute top-3 right-3 w-3 h-3 rounded-full bg-purple-500"
                        />
                    )}

                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-lg ${mode === "advanced" ? "bg-purple-500/20" : "bg-white/10"}`}>
                            <Layers className={`w-6 h-6 ${mode === "advanced" ? "text-purple-500" : "text-white"}`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Advanced</h3>
                            <p className="text-xs text-muted-foreground">Full Control</p>
                        </div>
                    </div>

                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span>Import trait layers</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span>Configure rarity %</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span>Generate unique combos</span>
                        </li>
                    </ul>

                    <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-muted-foreground">
                            Best for: Generative PFP projects, trait-based collections
                        </p>
                    </div>
                </motion.button>
            </div>
        </div>
    );
}
