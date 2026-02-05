import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Swords, Trophy, TrendingUp, Flame, Crown,
    Shield, Zap, Target, Medal, Users,
    ChevronRight, Sparkles, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWallet } from '@/providers/WalletProvider';
import { cn } from '@/lib/utils';
import { AnimatedBackground } from './AnimatedBackground'; // We'll extract this too

// --- Types ---
interface TraderStats {
    rank: number;
    username: string;
    avatar: string;
    wins: number;
    losses: number;
    winStreak: number;
    totalVolume: number;
    profitPercent: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';
    isOnline: boolean;
}

interface BattleMode {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    minBet: number;
    maxBet: number;
    duration: string;
    playerCount: string;
    color: string;
    gradient: string;
}

// Reuse existing mock data or pass as props
const MOCK_LEADERBOARD: TraderStats[] = [
    { rank: 1, username: 'CryptoKing', avatar: '', wins: 156, losses: 23, winStreak: 12, totalVolume: 45000, profitPercent: 234.5, tier: 'legendary', isOnline: true },
    { rank: 2, username: 'DiamondHands', avatar: '', wins: 134, losses: 31, winStreak: 8, totalVolume: 38000, profitPercent: 189.2, tier: 'diamond', isOnline: true },
    { rank: 3, username: 'WhaleWatch', avatar: '', wins: 121, losses: 28, winStreak: 5, totalVolume: 32000, profitPercent: 156.8, tier: 'diamond', isOnline: false },
    // ... more mock data
];

const BATTLE_MODES: BattleMode[] = [
    {
        id: 'duel',
        name: '1v1 Duel',
        description: 'Head-to-head trading battle. First to profit wins!',
        icon: <Swords className="w-8 h-8" />,
        minBet: 0.1,
        maxBet: 10,
        duration: '5 min',
        playerCount: '2',
        color: 'from-red-500 to-orange-500',
        gradient: 'bg-gradient-to-br from-red-500/20 to-orange-500/20',
    },
    {
        id: 'arena',
        name: 'Battle Arena',
        description: 'Free-for-all with up to 10 traders. Top 3 split the pot!',
        icon: <Shield className="w-8 h-8" />,
        minBet: 0.5,
        maxBet: 50,
        duration: '15 min',
        playerCount: '2-10',
        color: 'from-purple-500 to-pink-500',
        gradient: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
    },
    {
        id: 'blitz',
        name: 'Blitz Mode',
        description: 'Ultra-fast 60-second trades. Pure instinct!',
        icon: <Zap className="w-8 h-8" />,
        minBet: 0.05,
        maxBet: 5,
        duration: '60 sec',
        playerCount: '2-4',
        color: 'from-cyan-500 to-blue-500',
        gradient: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20',
    },
];

const TIER_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    bronze: { bg: 'bg-amber-900/20', border: 'border-amber-700/50', text: 'text-amber-500', glow: 'shadow-amber-500/20' },
    silver: { bg: 'bg-slate-400/20', border: 'border-slate-400/50', text: 'text-slate-300', glow: 'shadow-slate-400/20' },
    gold: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', glow: 'shadow-yellow-500/30' },
    platinum: { bg: 'bg-cyan-400/20', border: 'border-cyan-400/50', text: 'text-cyan-300', glow: 'shadow-cyan-400/30' },
    diamond: { bg: 'bg-blue-400/20', border: 'border-blue-400/50', text: 'text-blue-300', glow: 'shadow-blue-400/40' },
    legendary: { bg: 'bg-purple-500/20', border: 'border-purple-400/50', text: 'text-purple-300', glow: 'shadow-purple-500/50' },
};

export const SolanaBattleTemplate = () => {
    const [selectedTab, setSelectedTab] = useState('leaderboard');
    const [countdown, setCountdown] = useState({ hours: 2, minutes: 34, seconds: 56 });

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                let { hours, minutes, seconds } = prev;
                seconds--;
                if (seconds < 0) { seconds = 59; minutes--; }
                if (minutes < 0) { minutes = 59; hours--; }
                if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
                return { hours, minutes, seconds };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen bg-background relative font-sans">
            <AnimatedBackground />

            <div className="relative z-10 container mx-auto px-4 py-8">
                {/* HERO SECTION - SOLANA STYLE */}
                <motion.div
                    className="relative text-center py-16 px-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <motion.div
                        className="relative inline-block mb-6"
                        animate={{
                            textShadow: [
                                "0 0 20px hsl(var(--primary) / 0.5)",
                                "0 0 40px hsl(var(--primary) / 0.8)",
                                "0 0 20px hsl(var(--primary) / 0.5)",
                            ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic transform -skew-x-6">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9945FF] via-[#14F195] to-[#9945FF] bg-[length:200%_auto] animate-gradient">
                                SOLANA
                            </span>
                            <br />
                            <span className="text-foreground">BATTLE</span>
                        </h1>
                    </motion.div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                        {[
                            { label: 'Active Degens', value: '247', icon: Swords, color: 'text-red-500' },
                            { label: 'Total Volume', value: '45.2K SOL', icon: TrendingUp, color: 'text-green-500' },
                            { label: 'Prize Pool', value: '10K SOL', icon: Trophy, color: 'text-yellow-500' },
                            { label: 'Avg ROI', value: '+892%', icon: Flame, color: 'text-orange-500' },
                        ].map((stat, i) => (
                            <Card key={i} className="bg-black/40 border-[#14F195]/20 backdrop-blur-md">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                    <div>
                                        <p className="text-xl font-bold font-mono">{stat.value}</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Battle Modes */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {BATTLE_MODES.map((mode) => (
                            <motion.div
                                key={mode.id}
                                whileHover={{ scale: 1.03, y: -5 }}
                                className="group cursor-pointer"
                            >
                                <Card className={cn(
                                    "relative overflow-hidden border-2 border-[#9945FF]/30 bg-black/50 hover:border-[#14F195] transition-all duration-300",
                                )}>
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={cn("p-3 rounded-xl bg-gradient-to-br from-[#9945FF]/20 to-[#14F195]/20 text-white")}>
                                                {mode.icon}
                                            </div>
                                            <Badge variant="outline" className="border-[#14F195] text-[#14F195]">{mode.minBet} SOL+</Badge>
                                        </div>
                                        <h3 className="text-2xl font-black italic mb-2">{mode.name}</h3>
                                        <p className="text-sm text-gray-400 mb-4">{mode.description}</p>
                                        <Button className="w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:opacity-90 font-bold transform -skew-x-6">
                                            ENTER ARENA
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
