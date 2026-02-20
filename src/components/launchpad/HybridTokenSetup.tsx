import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Coins, Loader2, CheckCircle, ExternalLink, AlertCircle,
    Plus, ArrowRight, Wallet, Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useWallet } from "@/providers/WalletProvider";
import { initializeUmi } from "@/config/solana";
import { createSplToken, type SplTokenConfig } from "@/chains/solana/splToken";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { cn } from "@/lib/utils";

interface HybridTokenSetupProps {
    /** Called when user finishes this step — passes the token mint address */
    onTokenReady: (tokenAddress: string, tokenDecimals: number) => void;
    /** Pre-set token address if already created */
    tokenAddress: string;
    tokenDecimals: number;
    onTokenAddressChange: (addr: string) => void;
    onTokenDecimalsChange: (dec: number) => void;
}

function FieldHint({ text }: { text: string }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help inline-block ml-1" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">{text}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function HybridTokenSetup({
    onTokenReady,
    tokenAddress,
    tokenDecimals,
    onTokenAddressChange,
    onTokenDecimalsChange,
}: HybridTokenSetupProps) {
    const { getSolanaProvider, network, isConnected, chainType } = useWallet();
    const walletReady = isConnected && chainType === "solana";

    const [mode, setMode] = useState<"create" | "existing">(tokenAddress ? "existing" : "create");
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState(!!tokenAddress);

    // Create form state
    const [tokenName, setTokenName] = useState("");
    const [tokenSymbol, setTokenSymbol] = useState("");
    const [decimals, setDecimals] = useState("6");
    const [initialSupply, setInitialSupply] = useState("1000000");
    const [tokenUri, setTokenUri] = useState("");

    // Existing token state
    const [existingAddress, setExistingAddress] = useState(tokenAddress);
    const [existingDecimals, setExistingDecimals] = useState(String(tokenDecimals || 6));

    const handleCreate = async () => {
        if (!walletReady) {
            toast.error("Connect your Solana wallet first.");
            return;
        }
        if (!tokenName.trim() || !tokenSymbol.trim()) {
            toast.error("Token name and symbol are required.");
            return;
        }

        setCreating(true);
        try {
            const net = network === "mainnet" ? "mainnet" : "devnet";
            const umi = initializeUmi(net);
            const solProvider = getSolanaProvider();
            if (solProvider) {
                umi.use(walletAdapterIdentity(solProvider));
            }
            umi.use(mplTokenMetadata());

            const config: SplTokenConfig = {
                name: tokenName.trim(),
                symbol: tokenSymbol.trim().toUpperCase(),
                uri: tokenUri.trim(),
                decimals: Number(decimals) || 6,
                initialSupply: Number(initialSupply) || 0,
            };

            const result = await createSplToken(umi, config);
            onTokenAddressChange(result.mint);
            onTokenDecimalsChange(config.decimals!);
            onTokenReady(result.mint, config.decimals!);
            setCreated(true);
            toast.success("Token created successfully!");
        } catch (err: any) {
            console.error("[TokenCreate] Error:", err);
            toast.error(err?.message?.slice(0, 120) || "Token creation failed");
        } finally {
            setCreating(false);
        }
    };

    const handleUseExisting = () => {
        if (!existingAddress.trim() || existingAddress.trim().length < 32) {
            toast.error("Enter a valid token mint address.");
            return;
        }
        const dec = Number(existingDecimals) || 6;
        onTokenAddressChange(existingAddress.trim());
        onTokenDecimalsChange(dec);
        onTokenReady(existingAddress.trim(), dec);
        setCreated(true);
    };

    // ── Success state ──────────────────────────────────────────────────────────
    if (created && tokenAddress) {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        Token Ready
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Your SPL token is set up and ready to pair with the hybrid escrow.
                    </p>
                </div>

                <Card className="border-green-500/30 bg-green-500/5">
                    <CardContent className="py-5 px-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Coins className="w-5 h-5 text-green-500" />
                            <span className="font-semibold">Token Address</span>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border">
                            <code className="text-xs font-mono break-all">{tokenAddress}</code>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-[10px]">
                                Decimals: {tokenDecimals}
                            </Badge>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={() => window.open(
                                    `https://explorer.solana.com/address/${tokenAddress}?cluster=${network === "mainnet" ? "mainnet-beta" : "devnet"}`,
                                    "_blank"
                                )}
                            >
                                View on Explorer <ExternalLink className="w-3 h-3" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setCreated(false);
                        onTokenAddressChange("");
                    }}
                    className="text-muted-foreground"
                >
                    Change Token
                </Button>
            </div>
        );
    }

    // ── Form ───────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-primary" />
                    </div>
                    Paired Token
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Create a new SPL token for your collection or use an existing one.
                    This token will be used for the NFT ↔ Token swap pool.
                </p>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-lg border border-border p-1 bg-muted/30">
                <button
                    className={cn(
                        "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                        mode === "create"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setMode("create")}
                >
                    <Plus className="w-3.5 h-3.5 inline-block mr-1.5" />
                    Create New Token
                </button>
                <button
                    className={cn(
                        "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                        mode === "existing"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setMode("existing")}
                >
                    <ArrowRight className="w-3.5 h-3.5 inline-block mr-1.5" />
                    Use Existing
                </button>
            </div>

            {mode === "create" ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">
                                Token Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                placeholder="My Project Token"
                                value={tokenName}
                                onChange={(e) => setTokenName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">
                                Symbol <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                placeholder="MPT"
                                value={tokenSymbol}
                                onChange={(e) => setTokenSymbol(e.target.value)}
                                maxLength={10}
                                className="uppercase"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">
                                Decimals
                                <FieldHint text="Standard is 6 for most SPL tokens, 9 for SOL-like tokens" />
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                max="18"
                                value={decimals}
                                onChange={(e) => setDecimals(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">
                                Initial Supply
                                <FieldHint text="Tokens minted to your wallet on creation (human-readable)" />
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                placeholder="1000000"
                                value={initialSupply}
                                onChange={(e) => setInitialSupply(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">
                                Token Image URI
                                <FieldHint text="Optional metadata URI (Arweave/IPFS) for token icon" />
                            </Label>
                            <Input
                                placeholder="https://arweave.net/..."
                                value={tokenUri}
                                onChange={(e) => setTokenUri(e.target.value)}
                            />
                        </div>
                    </div>

                    <Separator className="bg-border/40" />

                    <Button
                        onClick={handleCreate}
                        disabled={!tokenName.trim() || !tokenSymbol.trim() || creating || !walletReady}
                        className="gap-2 w-full sm:w-auto"
                    >
                        {creating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creating Token…
                            </>
                        ) : !walletReady ? (
                            <>
                                <Wallet className="w-4 h-4" />
                                Connect Wallet
                            </>
                        ) : (
                            <>
                                <Coins className="w-4 h-4" />
                                Create Token On-Chain
                            </>
                        )}
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs">
                            Token Mint Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            placeholder="e.g. DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
                            className="font-mono text-xs"
                            value={existingAddress}
                            onChange={(e) => setExistingAddress(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5 max-w-[200px]">
                        <Label className="text-xs">
                            Token Decimals
                            <FieldHint text="Must match the token's actual decimals (usually 6 or 9)" />
                        </Label>
                        <Input
                            type="number"
                            min="0"
                            max="18"
                            value={existingDecimals}
                            onChange={(e) => setExistingDecimals(e.target.value)}
                        />
                    </div>

                    <Button
                        onClick={handleUseExisting}
                        disabled={!existingAddress.trim() || existingAddress.trim().length < 32}
                        className="gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Confirm Token
                    </Button>
                </div>
            )}
        </div>
    );
}
