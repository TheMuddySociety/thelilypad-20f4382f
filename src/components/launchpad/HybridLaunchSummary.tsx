import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle, ExternalLink, Repeat, Coins, Layers, ArrowLeft,
} from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";

interface HybridLaunchSummaryProps {
    collectionName: string;
    tokenAddress: string;
    escrowSignature: string;
    totalSupply: string;
    onClose: () => void;
}

export function HybridLaunchSummary({
    collectionName,
    tokenAddress,
    escrowSignature,
    totalSupply,
    onClose,
}: HybridLaunchSummaryProps) {
    const { network } = useWallet();
    const cluster = network === "mainnet" ? "mainnet-beta" : "devnet";

    return (
        <div className="space-y-6 text-center max-w-lg mx-auto">
            {/* Hero */}
            <div className="pt-4">
                <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">Collection Launched! 🎉</h2>
                <p className="text-sm text-muted-foreground mt-2">
                    Your <strong>{collectionName}</strong> hybrid collection is live.
                    The escrow is initialized on-chain and ready for NFT ↔ Token swaps.
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <Card className="border-border/60">
                    <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Layers className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-muted-foreground">Supply</span>
                        </div>
                        <p className="text-lg font-bold">{Number(totalSupply).toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Coins className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-muted-foreground">Token</span>
                        </div>
                        <p className="text-sm font-mono truncate" title={tokenAddress}>
                            {tokenAddress.slice(0, 8)}…{tokenAddress.slice(-4)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Repeat className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-muted-foreground">Escrow</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/30">
                            Active
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Explorer links */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
                {escrowSignature && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => window.open(
                            `https://explorer.solana.com/tx/${escrowSignature}?cluster=${cluster}`,
                            "_blank"
                        )}
                    >
                        View Transaction <ExternalLink className="w-3 h-3" />
                    </Button>
                )}
                {tokenAddress && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => window.open(
                            `https://explorer.solana.com/address/${tokenAddress}?cluster=${cluster}`,
                            "_blank"
                        )}
                    >
                        View Token <ExternalLink className="w-3 h-3" />
                    </Button>
                )}
            </div>

            {/* Back button */}
            <Button onClick={onClose} className="gap-2 mt-4">
                <ArrowLeft className="w-4 h-4" />
                Back to Launchpad
            </Button>
        </div>
    );
}
