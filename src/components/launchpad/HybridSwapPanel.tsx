/**
 * HybridSwapPanel — Holder-facing UI for MPL-Hybrid swaps.
 * Lets a holder:
 *   1. Enter a collection address
 *   2. Capture: spend tokens → random NFT
 *   3. Release: send NFT → tokens
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Repeat, ArrowRight, Loader2, Wallet, ShieldCheck, Info,
  ExternalLink, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/providers/WalletProvider";
import { initializeUmi } from "@/config/solana";
import {
  captureHybridNft,
  releaseHybridNft,
} from "@/chains/solana/hybrid";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplHybrid } from "@metaplex-foundation/mpl-hybrid";
import { mplCore } from "@metaplex-foundation/mpl-core";

export function HybridSwapPanel() {
  const { getSolanaProvider, network, isConnected, chainType } = useWallet();
  const walletReady = isConnected && chainType === "solana";

  const [collectionAddress, setCollectionAddress] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [feeWalletAddress, setFeeWalletAddress] = useState("");
  const [assetAddress, setAssetAddress] = useState(""); // for release
  const [mode, setMode] = useState<"capture" | "release">("capture");
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const net = network === "mainnet" ? "mainnet" : "devnet";
  const explorerBase = `https://explorer.solana.com/tx/`;

  const isValid =
    collectionAddress.trim().length >= 32 &&
    tokenAddress.trim().length >= 32 &&
    feeWalletAddress.trim().length >= 32 &&
    (mode === "capture" || assetAddress.trim().length >= 32);

  const handleSwap = async () => {
    if (!walletReady) return toast.error("Connect your Solana wallet first.");
    if (!isValid) return toast.error("Fill in all required fields.");

    setBusy(true);
    setLastTx(null);

    try {
      const umi = initializeUmi(net);
      const solProvider = getSolanaProvider();
      if (solProvider) umi.use(walletAdapterIdentity(solProvider));
      umi.use(mplHybrid());
      umi.use(mplCore());

      if (mode === "capture") {
        const result = await captureHybridNft(umi, {
          collectionAddress,
          tokenAddress,
          feeWalletAddress,
        });
        const sig = Buffer.from(result.signature).toString("base64").slice(0, 44);
        setLastTx(sig);
        toast.success("NFT captured! Tokens deducted from your wallet.");
      } else {
        const result = await releaseHybridNft(umi, {
          collectionAddress,
          tokenAddress,
          feeWalletAddress,
          assetAddress,
        });
        const sig = Buffer.from(result.signature).toString("base64").slice(0, 44);
        setLastTx(sig);
        toast.success("NFT released! Tokens returned to your wallet.");
      }
    } catch (err: any) {
      console.error("[HybridSwap] Error:", err);
      toast.error(err?.message?.slice(0, 140) || "Swap failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setMode("capture")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            mode === "capture"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          Capture NFT
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">Tokens → NFT</Badge>
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={() => setMode("release")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            mode === "release"
              ? "bg-blue-500/15 text-blue-400"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Repeat className="w-4 h-4" />
          Release NFT
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">NFT → Tokens</Badge>
        </button>
      </div>

      {/* Description */}
      <Card className="border-border/50 bg-muted/20">
        <CardContent className="py-3 px-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          {mode === "capture"
            ? "Spend your fungible tokens to capture a random NFT from the escrow pool."
            : "Return your NFT to the escrow pool and receive fungible tokens back."}
        </CardContent>
      </Card>

      <Separator className="bg-border/40" />

      {/* Shared fields */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Escrow Details</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Collection Address <span className="text-destructive">*</span></Label>
            <Input
              className="font-mono text-xs"
              placeholder="MPL Core collection address"
              value={collectionAddress}
              onChange={(e) => setCollectionAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Token Mint Address <span className="text-destructive">*</span></Label>
            <Input
              className="font-mono text-xs"
              placeholder="SPL token mint used for swaps"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fee Wallet <span className="text-destructive">*</span></Label>
            <Input
              className="font-mono text-xs"
              placeholder="Fee collection wallet"
              value={feeWalletAddress}
              onChange={(e) => setFeeWalletAddress(e.target.value)}
            />
          </div>

          {/* Release-specific */}
          {mode === "release" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Your NFT Asset Address <span className="text-destructive">*</span></Label>
              <Input
                className="font-mono text-xs"
                placeholder="The Core asset you want to release"
                value={assetAddress}
                onChange={(e) => setAssetAddress(e.target.value)}
              />
            </div>
          )}
        </div>
      </section>

      {/* Last tx */}
      {lastTx && (
        <Card className="border-green-500/30 bg-green-500/10">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-xs text-green-300 font-medium flex-1">Swap confirmed!</p>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] border-green-500/30 text-green-300 hover:bg-green-500/20 gap-1"
              onClick={() =>
                window.open(
                  `${explorerBase}${lastTx}?cluster=${net === "mainnet" ? "mainnet-beta" : "devnet"}`,
                  "_blank"
                )
              }
            >
              View <ExternalLink className="w-2.5 h-2.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action */}
      <Button
        onClick={handleSwap}
        disabled={!isValid || busy || !walletReady}
        className={`w-full h-12 text-base font-bold gap-2 ${
          mode === "capture"
            ? ""
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {busy ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
        ) : !walletReady ? (
          <><Wallet className="w-4 h-4" /> Connect Solana Wallet</>
        ) : mode === "capture" ? (
          <><ShieldCheck className="w-4 h-4" /> Capture NFT</>
        ) : (
          <><Repeat className="w-4 h-4" /> Release NFT for Tokens</>
        )}
      </Button>

      <p className="text-center text-[10px] text-muted-foreground">
        Powered by{" "}
        <a
          href="https://developers.metaplex.com/smart-contracts/mpl-hybrid"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground"
        >
          Metaplex MPL-Hybrid
        </a>{" "}
        · Program: <code className="font-mono">MPL4o4wMzndgh8T1NVDxELQCj5UQfYTYEkabX3wNKtb</code>
      </p>
    </div>
  );
}
