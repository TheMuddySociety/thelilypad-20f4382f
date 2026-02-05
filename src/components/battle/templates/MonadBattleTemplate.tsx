import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Swords, Zap, Activity, Radio,
    Terminal, Shield, Crosshair
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AnimatedBackground } from './AnimatedBackground';

// Types (shared)
interface BattleMode {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    minBet: number;
    maxBet: number;
}

const BATTLE_MODES: BattleMode[] = [
    {
        id: 'duel',
        name: '1v1_OVERRIDE',
        description: 'Direct neural link combat. Winner takes profit.',
        icon: <Swords className="w-6 h-6" />,
        minBet: 0.1,
        maxBet: 10,
    },
    {
        id: 'arena',
        name: 'NET_ARENA',
        description: 'Multi-node skirmish. Survive the purge.',
        icon: <Radio className="w-6 h-6" />,
        minBet: 0.5,
        maxBet: 50,
    },
    {
        id: 'blitz',
        name: 'SPEED_HACK',
        description: '60s connection window. Execute fast.',
        icon: <Zap className="w-6 h-6" />,
        minBet: 0.05,
        maxBet: 5,
    },
];

export const MonadBattleTemplate = () => {
    // Glitch effect variant
    const glitchAnim = {
        hidden: { x: 0, opacity: 1 },
        visible: {
            x: [0, -2, 2, -1, 1, 0],
            opacity: [1, 0.8, 1, 0.9, 1],
            transition: {
                duration: 0.2,
                repeat: Infinity,
                repeatDelay: Math.random() * 5,
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#0E0E12] text-[#836EF9] font-mono relative overflow-hidden">
            {/* Grid Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-10"
                style={{ backgroundImage: 'linear-gradient(#836EF9 1px, transparent 1px), linear-gradient(90deg, #836EF9 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />

            <div className="relative z-10 container mx-auto px-4 py-8">
                {/* HEADER - Cyberpunk Style */}
                <header className="flex justify-between items-end border-b border-[#836EF9]/50 pb-6 mb-12">
                    <div>
                        <motion.h1
                            className="text-6xl font-black tracking-tighter text-white mb-2"
                            variants={glitchAnim}
                            initial="hidden"
                            animate="visible"
                        >
                            MONAD<span className="text-[#836EF9]">.SYS</span>
                        </motion.h1>
                        <div className="flex items-center gap-2 text-[#A090FF]">
                            <Terminal className="w-4 h-4" />
                            <span>SYSTEM_READY // BATTLE_PROTOCOL_INITIATED</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <Badge variant="outline" className="border-[#836EF9] text-[#836EF9] mb-1">
                            NET_STATUS: ONLINE
                        </Badge>
                        <p className="text-xs text-muted-foreground">PING: 12ms</p>
                    </div>
                </header>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN - STATS TERMINAL */}
                    <div className="lg:col-span-3 space-y-4">
                        <Card className="bg-black/50 border-[#836EF9] rounded-none">
                            <CardHeader className="bg-[#836EF9]/10 border-b border-[#836EF9]/50 py-3">
                                <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Live_Metrics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 font-mono text-sm space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">active_nodes:</span>
                                    <span className="text-white">1,337</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">vol_24h:</span>
                                    <span className="text-white">89.2M MON</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">sys_load:</span>
                                    <span className="text-green-400">OPTIMAL</span>
                                </div>
                                <div className="h-px bg-[#836EF9]/30 my-2" />
                                <div className="text-xs text-[#836EF9]">
                            > SCANNING MEMPOOL...<br />
                            > DETECTING ARB OPPS...<br />
                            > READY TO EXECUTE.
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* CENTER COLUMN - BATTLE MODES */}
                    <div className="lg:col-span-9">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-6 uppercase flex items-center gap-2">
                                <Crosshair className="w-6 h-6 text-[#836EF9]" />
                                Select_Engagement
                            </h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                {BATTLE_MODES.map((mode) => (
                                    <motion.div
                                        key={mode.id}
                                        whileHover={{ scale: 1.02 }}
                                        className="group relative"
                                    >
                                        <div className="absolute inset-0 bg-[#836EF9] blur opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
                                        <Card className="relative bg-black border border-[#836EF9]/50 rounded-none group-hover:border-[#836EF9] transition-colors h-full">
                                            <CardContent className="p-6">
                                                <div className="mb-4 text-[#836EF9]">
                                                    {mode.icon}
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">{mode.name}</h3>
                                                <p className="text-xs text-gray-400 mb-6 font-mono leading-relaxed">
                                                    {mode.description}
                                                </p>
                                                <Button className="w-full bg-[#836EF9] hover:bg-[#6C56E8] text-white rounded-none border border-white/10 uppercase tracking-widest text-xs font-bold">
                                                    Initialize
                                                </Button>
                                            </CardContent>
                                            {/* Decorative Corner */}
                                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#836EF9]" />
                                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#836EF9]" />
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* ACTIVE SESSIONS LIST (Terminal Style) */}
                        <Card className="bg-black/80 border border-[#836EF9]/30 rounded-none">
                            <CardHeader className="py-3 border-b border-[#836EF9]/30">
                                <CardTitle className="text-sm font-mono uppercase text-white">Active_Sessions.log</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-left text-xs font-mono">
                                    <thead className="bg-[#836EF9]/10 text-[#836EF9]">
                                        <tr>
                                            <th className="p-3">ID</th>
                                            <th className="p-3">MODE</th>
                                            <th className="p-3">STATUS</th>
                                            <th className="p-3 text-right">POT</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#836EF9]/10 text-gray-300">
                                        <tr className="hover:bg-[#836EF9]/5 cursor-pointer transition-colors">
                                            <td className="p-3">#8F3A</td>
                                            <td className="p-3">1v1_OVERRIDE</td>
                                            <td className="p-3"><span className="text-green-400 animate-pulse">● LIVE</span></td>
                                            <td className="p-3 text-right">500 MON</td>
                                        </tr>
                                        <tr className="hover:bg-[#836EF9]/5 cursor-pointer transition-colors">
                                            <td className="p-3">#2B9C</td>
                                            <td className="p-3">NET_ARENA</td>
                                            <td className="p-3"><span className="text-yellow-400">WAITING</span></td>
                                            <td className="p-3 text-right">1.2K MON</td>
                                        </tr>
                                        <tr className="hover:bg-[#836EF9]/5 cursor-pointer transition-colors">
                                            <td className="p-3">#7E1D</td>
                                            <td className="p-3">SPEED_HACK</td>
                                            <td className="p-3"><span className="text-green-400 animate-pulse">● LIVE</span></td>
                                            <td className="p-3 text-right">100 MON</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};
