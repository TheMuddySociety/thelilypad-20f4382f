import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
    CalendarIcon,
    Coins,
    Clock,
    ShieldCheck,
    Users,
    Lock,
    MinusCircle,
    PlusCircle,
    Bot
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LaunchpadPhase } from "@/hooks/useSolanaLaunch";

// Re-export for consumers
export type { LaunchpadPhase } from '@/chains';

interface GuardConfiguratorProps {
    phase: LaunchpadPhase;
    onChange: (updates: Partial<LaunchpadPhase>) => void;
    chainSymbol?: string;
}

export function GuardConfigurator({ phase, onChange, chainSymbol = 'SOL' }: GuardConfiguratorProps) {
    const [dateType, setDateType] = useState<'start' | 'end'>('start');
    const isSolana = chainSymbol === 'SOL';

    // Helpers to toggle sections
    const toggleGatekeeper = (enabled: boolean) => {
        onChange({ gatekeeper: enabled ? { network: "ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6", expireOnUse: true } : undefined });
    };

    const toggleNftGate = (enabled: boolean) => {
        onChange({ nftGate: enabled ? { collection: "" } : undefined });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Payment & Limits Config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 p-4 rounded-xl bg-secondary/20 border border-white/5 backdrop-blur-sm">
                    <Label className="flex items-center gap-2 text-primary font-semibold"><Coins className="w-4 h-4" /> Mint Price ({chainSymbol})</Label>
                    <Input
                        type="number"
                        value={phase.price}
                        onChange={(e) => onChange({ price: Number(e.target.value) })}
                        className="bg-background/50 border-white/10"
                        placeholder="0.00"
                    />
                </div>
                <div className="space-y-2 p-4 rounded-xl bg-secondary/20 border border-white/5 backdrop-blur-sm">
                    <Label className="flex items-center gap-2 text-primary font-semibold"><Users className="w-4 h-4" /> Max Per Wallet</Label>
                    <Input
                        type="number"
                        value={phase.maxPerWallet || 0}
                        onChange={(e) => onChange({ maxPerWallet: Number(e.target.value) })}
                        className="bg-background/50 border-white/10"
                        placeholder="Unlimited"
                    />
                    <p className="text-xs text-muted-foreground">Set 0 for unlimited</p>
                </div>
            </div>

            {/* Schedule Config */}
            <div className="space-y-2 p-4 rounded-xl bg-secondary/20 border border-white/5 backdrop-blur-sm">
                <Label className="flex items-center gap-2 text-primary mb-2 font-semibold"><Clock className="w-4 h-4" /> Schedule</Label>
                <div className="flex flex-col md:flex-row gap-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-background/50 border-white/10", !phase.startTime && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {phase.startTime ? format(phase.startTime, "PPP") : <span>Pick Start Date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={phase.startTime || undefined} onSelect={(d) => onChange({ startTime: d })} initialFocus />
                        </PopoverContent>
                    </Popover>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-background/50 border-white/10", !phase.endTime && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {phase.endTime ? format(phase.endTime, "PPP") : <span>Pick End Date (Optional)</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={phase.endTime || undefined} onSelect={(d) => onChange({ endTime: d })} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Advanced Guards Accordion-style - Only for Solana */}
            {isSolana && (
                <div className="space-y-4">
                    <Label className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Advanced Protection</Label>

                    {/* Gatekeeper (Captcha) */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-white/5 hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-blue-500/10 text-blue-400">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium">Bot Protection (Captcha)</p>
                                <p className="text-xs text-muted-foreground">Require user to solve puzzle via Civic/Gateway</p>
                            </div>
                        </div>
                        <Switch checked={!!phase.gatekeeper} onCheckedChange={toggleGatekeeper} />
                    </div>

                    {/* NFT Gate */}
                    <div className="space-y-3 p-4 rounded-xl bg-secondary/20 border border-white/5 hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-purple-500/10 text-purple-400">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium">NFT Holder Gate</p>
                                    <p className="text-xs text-muted-foreground">Only owners of a specific collection can mint</p>
                                </div>
                            </div>
                            <Switch checked={!!phase.nftGate} onCheckedChange={toggleNftGate} />
                        </div>

                        {phase.nftGate && (
                            <div className="pt-2 animate-in slide-in-from-top-2">
                                <Label className="text-xs">Required Collection Address (Mint)</Label>
                                <Input
                                    value={phase.nftGate.collection}
                                    onChange={(e) => onChange({ nftGate: { ...phase.nftGate!, collection: e.target.value } })}
                                    placeholder="Address of the collection NFT..."
                                    className="mt-1 bg-background/50 border-white/10 font-mono text-xs"
                                />
                            </div>
                        )}
                    </div>

                    {/* Allowlist (Merkle) is usually handled by uploading a CSV in the modal, 
                        but we can show status here */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-green-500/10 text-green-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium">Allowlist</p>
                                <p className="text-xs text-muted-foreground">
                                    {phase.merkleRoot ? "Active (Merkle Root Set)" : "Upload wallet list in phase settings"}
                                </p>
                            </div>
                        </div>
                        {phase.merkleRoot && <Badge variant="secondary" className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Active</Badge>}
                    </div>

                </div>
            )}
        </div>
    );
}
