import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Repeat, Wallet, Coins, ArrowRight, ShieldCheck, Info,
  ExternalLink, Loader2, CheckCircle, AlertCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useWallet } from "@/providers/WalletProvider";
import { initializeUmi } from "@/config/solana";
import { initHybridEscrow, type HybridEscrowConfig } from "@/chains/solana/hybrid";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplHybrid } from "@metaplex-foundation/mpl-hybrid";
import { cn } from "@/lib/utils";

interface HybridEscrowFormProps {
  onClose: () => void;
}

interface FormState {
  name: string;
  uri: string;
  collectionAddress: string;
  tokenAddress: string;
  feeWalletAddress: string;
  swapAmount: string;
  feeAmount: string;
  solFee: string;
  min: string;
  max: string;
  tokenDecimals: string;
  path: 0 | 1;
}

const INITIAL_STATE: FormState = {
  name: "",
  uri: "",
  collectionAddress: "",
  tokenAddress: "",
  feeWalletAddress: "",
  swapAmount: "",
  feeAmount: "",
  solFee: "0",
  min: "0",
  max: "0",
  tokenDecimals: "6",
  path: 0,
};

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

export function HybridEscrowForm({ onClose }: HybridEscrowFormProps) {
  const { getSolanaProvider, network, isConnected, chainType } = useWallet();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const walletReady = isConnected && chainType === "solana";

  const set = (key: keyof FormState, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isValid =
    form.name.trim() &&
    form.collectionAddress.trim().length >= 32 &&
    form.tokenAddress.trim().length >= 32 &&
    form.feeWalletAddress.trim().length >= 32 &&
    form.uri.trim() &&
    Number(form.swapAmount) > 0 &&
    Number(form.max) >= Number(form.min);

  const handleSubmit = async () => {
    if (!walletReady) {
      toast.error("Connect your Solana wallet first.");
      return;
    }
    if (!isValid) {
      toast.error("Fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const net = network === "mainnet" ? "mainnet" : "devnet";
      const umi = initializeUmi(net);
      const solProvider = getSolanaProvider();
      if (solProvider) {
        umi.use(walletAdapterIdentity(solProvider));
      }
      umi.use(mplHybrid());

      const config: HybridEscrowConfig = {
        name: form.name,
        uri: form.uri,
        collectionAddress: form.collectionAddress,
        tokenAddress: form.tokenAddress,
        feeWalletAddress: form.feeWalletAddress,
        swapAmount: Number(form.swapAmount),
        feeAmount: Number(form.feeAmount) || 0,
        solFee: Number(form.solFee) || 0,
        min: Number(form.min),
        max: Number(form.max),
        path: form.path,
        tokenDecimals: Number(form.tokenDecimals) || 6,
      };

      const result = await initHybridEscrow(umi, config);
      const sig = Buffer.from(result.signature).toString("base64").slice(0, 44);
      setTxSignature(sig);
      toast.success("Hybrid escrow initialized!");
    } catch (err: any) {
      console.error("[HybridEscrow] Error:", err);
      toast.error(err?.message?.slice(0, 120) || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (txSignature) {
    return (
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-lg font-bold">Escrow Live!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your MPL-404 escrow has been initialized on-chain. Fund it with NFTs and tokens, then share the swap UI with your holders.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Back to Launchpad
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => window.open(
                `https://explorer.solana.com/tx/${txSignature}?cluster=${network === "mainnet" ? "mainnet-beta" : "devnet"}`,
                "_blank"
              )}
            >
              View Transaction <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Repeat className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Initialize MPL-404 Escrow</h2>
          <p className="text-xs text-muted-foreground">Create a hybrid swap pool — NFTs ↔ Tokens</p>
        </div>
        <Badge className="ml-auto bg-primary/15 text-primary border-primary/30 border text-[10px]">MPL-Hybrid</Badge>
      </div>

      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">How it works: </span>
            You fund an escrow with NFTs from your collection. Holders swap fungible tokens to <strong>capture</strong> a random NFT, or <strong>release</strong> an NFT back for tokens. Metadata can update on swap.
          </div>
        </CardContent>
      </Card>

      {/* Section: Identity */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Escrow Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Escrow Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="My Hybrid Swap"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Metadata Base URI <span className="text-destructive">*</span>
              <FieldHint text="Arweave manifest or base URI. Asset metadata at {uri}/{index}.json" />
            </Label>
            <Input
              placeholder="https://arweave.net/abc123/"
              value={form.uri}
              onChange={(e) => set("uri", e.target.value)}
            />
          </div>
        </div>
      </section>

      <Separator className="bg-border/40" />

      {/* Section: Addresses */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">On-Chain Addresses</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Collection Address <span className="text-destructive">*</span>
              <FieldHint text="The Metaplex Core collection mint address" />
            </Label>
            <Input
              placeholder="e.g. 7nE7..."
              className="font-mono text-xs"
              value={form.collectionAddress}
              onChange={(e) => set("collectionAddress", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Fungible Token Address <span className="text-destructive">*</span>
              <FieldHint text="SPL token mint used for swaps (e.g. your project token)" />
            </Label>
            <Input
              placeholder="e.g. DezX..."
              className="font-mono text-xs"
              value={form.tokenAddress}
              onChange={(e) => set("tokenAddress", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Fee Wallet <span className="text-destructive">*</span>
              <FieldHint text="Wallet that collects swap fees" />
            </Label>
            <Input
              placeholder="e.g. 9pXy..."
              className="font-mono text-xs"
              value={form.feeWalletAddress}
              onChange={(e) => set("feeWalletAddress", e.target.value)}
            />
          </div>
        </div>
      </section>

      <Separator className="bg-border/40" />

      {/* Section: Economics */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Swap Economics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Swap Amount <span className="text-destructive">*</span>
              <FieldHint text="Tokens received/spent per swap (human-readable)" />
            </Label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="100"
              value={form.swapAmount}
              onChange={(e) => set("swapAmount", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Token Fee
              <FieldHint text="Token fee charged on NFT capture (human-readable, 0 = none)" />
            </Label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="5"
              value={form.feeAmount}
              onChange={(e) => set("feeAmount", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              SOL Fee
              <FieldHint text="Additional SOL fee per capture (in SOL, 0 = none)" />
            </Label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="0.01"
              value={form.solFee}
              onChange={(e) => set("solFee", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Token Decimals
              <FieldHint text="Decimal places for your SPL token (usually 6 or 9)" />
            </Label>
            <Input
              type="number"
              min="0"
              max="18"
              value={form.tokenDecimals}
              onChange={(e) => set("tokenDecimals", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Min URI Index
              <FieldHint text="Minimum metadata index (inclusive)" />
            </Label>
            <Input
              type="number"
              min="0"
              value={form.min}
              onChange={(e) => set("min", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Max URI Index
              <FieldHint text="Maximum metadata index (inclusive)" />
            </Label>
            <Input
              type="number"
              min="0"
              value={form.max}
              onChange={(e) => set("max", e.target.value)}
            />
          </div>
        </div>
      </section>

      <Separator className="bg-border/40" />

      {/* Section: Metadata Path */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Metadata Behavior</h3>
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
          <div>
            <p className="text-sm font-medium">Update metadata on swap</p>
            <p className="text-xs text-muted-foreground">When enabled (path 0), NFT metadata re-rolls on each swap cycle.</p>
          </div>
          <Switch
            checked={form.path === 0}
            onCheckedChange={(checked) => set("path", checked ? 0 : 1)}
          />
        </div>
      </section>

      {/* Summary */}
      <Card className="border-border/60 bg-muted/20">
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Coins className="w-4 h-4 text-primary" />
            Swap Flow Preview
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">Holder</Badge>
            <span>sends {form.swapAmount || "?"} tokens</span>
            <ArrowRight className="w-3 h-3" />
            <span>receives random NFT</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Badge variant="outline" className="text-[10px]">Holder</Badge>
            <span>sends NFT back</span>
            <ArrowRight className="w-3 h-3" />
            <span>receives {form.swapAmount || "?"} tokens</span>
          </div>
          {(Number(form.feeAmount) > 0 || Number(form.solFee) > 0) && (
            <p className="text-[10px] text-muted-foreground mt-2">
              + {Number(form.feeAmount) > 0 ? `${form.feeAmount} token fee` : ""}
              {Number(form.feeAmount) > 0 && Number(form.solFee) > 0 ? " + " : ""}
              {Number(form.solFee) > 0 ? `${form.solFee} SOL fee` : ""} on capture
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || submitting || !walletReady}
          className="gap-2 min-w-[180px]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirming…
            </>
          ) : !walletReady ? (
            <>
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Initialize Escrow
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
