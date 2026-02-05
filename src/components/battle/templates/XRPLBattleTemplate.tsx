import React from 'react';
import { motion } from 'framer-motion';
import {
    BarChart2, Globe, ShieldCheck,
    ArrowUpRight, Clock, Users,
    Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Institutional Style Components

export const XRPLBattleTemplate = () => {
    return (
        <div className="min-h-screen bg-[#F5F7FA] text-[#1D2939] font-sans">
            {/* Top Navigation Bar - Bloomberg Terminal Style */}
            <div className="bg-[#000F2E] text-white px-6 py-2 flex justify-between items-center text-xs font-semibold tracking-wide">
                <div className="flex gap-6">
                    <span className="text-[#3E8DFF]">XRPL BATTLE TERMINAL</span>
                    <span>MARKET STATUS: <span className="text-green-400">OPEN</span></span>
                    <span>LEDGER: 89,234,102</span>
                </div>
                <div>
                    <span>UTC: {new Date().toISOString().slice(11, 19)}</span>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                {/* Dashboard Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[#101828] mb-2">Institutional Trading Arena</h1>
                        <p className="text-[#667085]">Execute high-precision floor sweeps on the XRP Ledger.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="bg-white border-[#D0D5DD] text-[#344054]">
                            <Globe className="w-4 h-4 mr-2" />
                            Global View
                        </Button>
                        <Button className="bg-[#0055FF] hover:bg-[#0044CC] text-white">
                            <Briefcase className="w-4 h-4 mr-2" />
                            My Portfolio
                        </Button>
                    </div>
                </div>

                {/* METRICS GRID */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Total Volume (24h)', value: '45.2M XRP', change: '+12.4%', icon: BarChart2 },
                        { label: 'Active Escrows', value: '1,240', change: '+5.2%', icon: ShieldCheck },
                        { label: 'Avg Execution', value: '3.2s', change: '-0.4s', icon: Clock },
                        { label: 'Participants', value: '8,492', change: '+231', icon: Users },
                    ].map((stat, i) => (
                        <Card key={i} className="border-[#E4E7EC] shadow-sm bg-white">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-[#F2F4F7] rounded-full">
                                        <stat.icon className="w-5 h-5 text-[#475467]" />
                                    </div>
                                    <Badge variant="secondary" className="bg-[#ECFDF3] text-[#027A48]">
                                        {stat.change}
                                    </Badge>
                                </div>
                                <h3 className="text-3xl font-semibold text-[#101828] mb-1">{stat.value}</h3>
                                <p className="text-sm text-[#475467] font-medium">{stat.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* MAIN TRADING VIEW */}
                <div className="grid lg:grid-cols-3 gap-8 h-[600px]">
                    {/* Left Col: Market List */}
                    <Card className="col-span-1 border-[#E4E7EC] shadow-sm bg-white overflow-hidden">
                        <CardHeader className="bg-[#F9FAFB] border-b border-[#E4E7EC] py-4">
                            <CardTitle className="text-sm font-bold text-[#475467] uppercase">Available Markets</CardTitle>
                        </CardHeader>
                        <div className="divide-y divide-[#E4E7EC]">
                            {[
                                { name: 'XRP/USD', type: 'Forex Battle', vol: '12M', status: 'Active' },
                                { name: 'Solo/XRP', type: 'Token Duel', vol: '5.2M', status: 'Active' },
                                { name: 'RLUSD/XRP', type: 'Stable Swap', vol: '24M', status: 'Active' },
                                { name: 'Meme/XRP', type: 'Speculation', vol: '890K', status: 'Waiting' },
                            ].map((market, i) => (
                                <div key={i} className="p-4 hover:bg-[#F9FAFB] cursor-pointer group transition-colors flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-[#101828]">{market.name}</h4>
                                        <p className="text-xs text-[#667085]">{market.type}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-[#101828]">{market.vol}</p>
                                        <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{market.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Right Col: Chart/Action */}
                    <Card className="col-span-2 border-[#E4E7EC] shadow-sm bg-white flex flex-col">
                        <CardHeader className="bg-[#F9FAFB] border-b border-[#E4E7EC] py-4 flex flex-row justify-between items-center">
                            <CardTitle className="text-sm font-bold text-[#475467] uppercase">Market Depth / Execution</CardTitle>
                            <div className="flex gap-2">
                                <Button size="sm" variant="ghost" className="text-xs">1H</Button>
                                <Button size="sm" variant="ghost" className="text-xs bg-white shadow-sm border">4H</Button>
                                <Button size="sm" variant="ghost" className="text-xs">1D</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-8 flex items-center justify-center bg-[#F2F4F7]">
                            <div className="text-center">
                                <BarChart2 className="w-16 h-16 text-[#98A2B3] mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-[#101828]">Select a Market to Begin</h3>
                                <p className="text-[#667085] mb-6">View real-time liquidity depth and execute algorithmic sweeps.</p>
                                <Button className="bg-[#0055FF] hover:bg-[#0044CC]">
                                    <ArrowUpRight className="w-4 h-4 mr-2" />
                                    Initialize Order
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
