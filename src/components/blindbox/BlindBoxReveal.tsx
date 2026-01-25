import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Star, Trophy, Zap, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Reward {
    type: string;
    name: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    value?: string;
}

interface BlindBoxRevealProps {
    boxName: string;
    boxImage?: string | null;
    rewards: Reward[];
    onComplete: () => void;
}

const RARITY_CONFIG = {
    common: {
        color: 'text-slate-400',
        bg: 'bg-slate-400/10',
        border: 'border-slate-400/30',
        glow: 'shadow-[0_0_15px_rgba(148,163,184,0.3)]',
        icon: Gift
    },
    uncommon: {
        color: 'text-green-400',
        bg: 'bg-green-400/10',
        border: 'border-green-400/30',
        glow: 'shadow-[0_0_20px_rgba(74,222,128,0.4)]',
        icon: Zap
    },
    rare: {
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
        border: 'border-blue-400/30',
        glow: 'shadow-[0_0_25px_rgba(96,165,250,0.5)]',
        icon: Star
    },
    epic: {
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
        border: 'border-purple-400/30',
        glow: 'shadow-[0_0_30px_rgba(192,132,252,0.6)]',
        icon: Trophy
    },
    legendary: {
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
        border: 'border-yellow-400/30',
        glow: 'shadow-[0_0_40px_rgba(250,204,21,0.7)]',
        icon: Sparkles
    }
};

export const BlindBoxReveal: React.FC<BlindBoxRevealProps> = ({
    boxName,
    boxImage,
    rewards,
    onComplete,
}) => {
    const [phase, setPhase] = useState<'idle' | 'shaking' | 'burst' | 'revealing' | 'complete'>('idle');
    const [revealedIndex, setRevealedIndex] = useState(-1);

    useEffect(() => {
        // Auto-start shaking after a short delay
        const timer = setTimeout(() => setPhase('shaking'), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (phase === 'shaking') {
            const timer = setTimeout(() => setPhase('burst'), 1500);
            return () => clearTimeout(timer);
        }
        if (phase === 'burst') {
            const timer = setTimeout(() => {
                setPhase('revealing');
                setRevealedIndex(0);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    useEffect(() => {
        if (phase === 'revealing' && revealedIndex < rewards.length) {
            const timer = setTimeout(() => {
                if (revealedIndex < rewards.length - 1) {
                    setRevealedIndex(prev => prev + 1);
                } else {
                    setPhase('complete');
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [phase, revealedIndex, rewards.length]);

    const containerVariants = {
        idle: { scale: 1 },
        shaking: {
            rotate: [0, -5, 5, -5, 5, 0],
            scale: [1, 1.05, 1],
            transition: {
                rotate: { repeat: Infinity, duration: 0.2 },
                scale: { duration: 0.5 }
            }
        },
        burst: {
            scale: [1, 1.5, 0],
            opacity: [1, 1, 0],
            transition: { duration: 0.6, ease: "easeOut" as const }
        }
    };

    const burstVariants = {
        initial: { scale: 0, opacity: 0 },
        animate: {
            scale: [0, 2, 2.5],
            opacity: [0, 1, 0],
            transition: { duration: 0.8, ease: "easeOut" as const }
        }
    };

    return (
        <div className="relative min-h-[400px] flex flex-col items-center justify-center overflow-hidden">
            {/* Background Glow */}
            <AnimatePresence>
                {phase === 'burst' && (
                    <motion.div
                        variants={burstVariants}
                        initial="initial"
                        animate="animate"
                        className="absolute inset-0 bg-gradient-radial from-primary/40 to-transparent rounded-full z-0"
                    />
                )}
            </AnimatePresence>

            {/* The Box */}
            <AnimatePresence>
                {(phase === 'idle' || phase === 'shaking' || phase === 'burst') && (
                    <motion.div
                        variants={containerVariants}
                        initial="idle"
                        animate={phase}
                        className="relative z-10"
                    >
                        <div className="relative w-48 h-48 flex items-center justify-center">
                            {boxImage ? (
                                <img src={boxImage} alt={boxName} className="w-full h-full object-contain drop-shadow-2xl" />
                            ) : (
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-primary/20 blur-2xl group-hover:bg-primary/30 transition-colors rounded-full" />
                                    <Gift className="w-32 h-32 text-primary relative z-10 drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" />

                                    {/* Ribbons/Fancy stuff */}
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                        className="absolute -inset-4 border-2 border-dashed border-primary/30 rounded-full"
                                    />
                                </div>
                            )}
                        </div>

                        {phase === 'shaking' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                            >
                                <div className="flex items-center gap-2 text-primary font-bold italic animate-pulse">
                                    <Sparkles className="w-4 h-4" />
                                    OPENING...
                                    <Sparkles className="w-4 h-4" />
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Rewards Display */}
            <div className="w-full max-w-sm z-20 space-y-4">
                <AnimatePresence mode="popLayout">
                    {phase === 'revealing' || phase === 'complete' ? (
                        <div className="grid grid-cols-1 gap-4">
                            {rewards.map((reward, index) => {
                                if (index > revealedIndex && phase !== 'complete') return null;
                                const config = RARITY_CONFIG[reward.rarity] || RARITY_CONFIG.common;
                                const Icon = config.icon;

                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 260,
                                            damping: 20,
                                            delay: phase === 'complete' ? 0 : 0
                                        }}
                                        className={`relative p-6 rounded-2xl border ${config.border} ${config.bg} ${config.glow} backdrop-blur-md overflow-hidden group`}
                                    >
                                        {/* Interior Sparkle Effect */}
                                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none" />

                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className={`p-4 rounded-xl bg-background/50 border ${config.border} ${config.color} group-hover:scale-110 transition-transform`}>
                                                <Icon className="w-8 h-8" />
                                            </div>
                                            <div className="flex-1">
                                                <Badge className={`${config.bg} ${config.color} border-none mb-1 capitalize text-[10px]`}>
                                                    {reward.rarity}
                                                </Badge>
                                                <h4 className="text-lg font-bold text-foreground leading-tight">
                                                    {reward.name}
                                                </h4>
                                                {reward.value && (
                                                    <p className="text-sm font-mono text-muted-foreground mt-1">
                                                        {reward.value}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Rarity Rank Icons */}
                                            <div className="flex flex-col gap-1">
                                                {[...Array(reward.rarity === 'legendary' ? 5 : reward.rarity === 'epic' ? 4 : reward.rarity === 'rare' ? 3 : reward.rarity === 'uncommon' ? 2 : 1)].map((_, i) => (
                                                    <Star key={i} className={`w-3 h-3 fill-current ${config.color}`} />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Radial Shine */}
                                        <motion.div
                                            animate={{
                                                x: ['-100%', '200%'],
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                repeatDelay: 2,
                                                ease: "easeInOut"
                                            }}
                                            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
                                        />
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : null}
                </AnimatePresence>

                {/* Complete State Actions */}
                <AnimatePresence>
                    {phase === 'complete' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="pt-6 flex justify-center"
                        >
                            <Button
                                size="lg"
                                onClick={onComplete}
                                className="px-12 rounded-full font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
                            >
                                Continue Adventure
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Multi-Reward Counter */}
            {rewards.length > 1 && (phase === 'revealing' || phase === 'complete') && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-4 right-4 bg-background/50 backdrop-blur-sm px-3 py-1 rounded-full border text-xs font-mono"
                >
                    {phase === 'complete' ? rewards.length : revealedIndex + 1} / {rewards.length}
                </motion.div>
            )}
        </div>
    );
};
