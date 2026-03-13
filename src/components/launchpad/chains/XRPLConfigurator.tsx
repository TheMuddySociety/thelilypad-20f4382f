import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, Zap, Info, ShieldAlert } from "lucide-react";

interface XRPLConfiguratorProps {
    taxon: number;
    onTaxonChange: (taxon: number) => void;
    transferFee: number;
    onTransferFeeChange: (fee: number) => void;
}

export function XRPLConfigurator({ taxon, onTaxonChange, transferFee, onTransferFeeChange }: XRPLConfiguratorProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-200">XRP Ledger XLS-20 Setup</p>
                    <p className="text-xs text-blue-300/80 leading-relaxed">
                        XRPL NFTs use native on-ledger features for royalties and collection grouping.
                        No smart contracts required.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 p-4 rounded-xl bg-secondary/20 border border-white/5 backdrop-blur-sm">
                    <Label className="flex items-center gap-2 text-primary font-semibold">
                        <Database className="w-4 h-4" /> Collection Taxon
                    </Label>
                    <Input
                        type="number"
                        value={taxon}
                        onChange={(e) => onTaxonChange(Number(e.target.value))}
                        className="bg-background/50 border-white/10"
                        placeholder="0"
                        min={0}
                    />
                    <p className="text-[10px] text-muted-foreground">
                        A unique identifier for your collection. All NFTs in this launch will share this Taxon.
                    </p>
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-secondary/20 border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-primary font-semibold">
                            <Zap className="w-4 h-4" /> Transfer Fee
                        </Label>
                        <Badge variant="outline" className="text-[10px]">
                            {transferFee.toFixed(2)}%
                        </Badge>
                    </div>
                    <Input
                        type="number"
                        value={transferFee}
                        onChange={(e) => onTransferFeeChange(Number(e.target.value))}
                        className="bg-background/50 border-white/10"
                        placeholder="0 - 50"
                        min={0}
                        max={50}
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Royalty percentage (e.g. 5.1%). Max 50%.
                    </p>
                </div>
            </div>

            {transferFee > 50 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-2 items-center text-destructive">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-xs font-medium">XRPL maximum transfer fee is 50.00%</span>
                </div>
            )}

            <div className="p-4 rounded-xl bg-secondary/10 border border-white/5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Minting Features</h4>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span>Fixed Supply Enforcement</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span>Native Burn Support</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span>Trustless Transferable Bit</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
