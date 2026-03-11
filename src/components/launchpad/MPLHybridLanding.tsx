/**
 * MPL-Hybrid Landing — shown when a user clicks the MPL-Hybrid tile.
 * Presents a two-tab layout: (1) Initialize Escrow, (2) Swap NFTs ↔ Tokens.
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Repeat,
  ArrowLeft,
  Coins,
  Image as ImageIcon,
  ArrowRightLeft,
  ShieldCheck,
  Zap,
  Layers,
  Info,
} from "lucide-react";
import { HybridEscrowForm } from "@/components/launchpad/HybridEscrowForm";
import { HybridSwapPanel } from "@/components/launchpad/HybridSwapPanel";
import { motion } from "framer-motion";

interface MPLHybridLandingProps {
  onClose: () => void;
}

export function MPLHybridLanding({ onClose }: MPLHybridLandingProps) {
  const [activeTab, setActiveTab] = useState("escrow");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onClose}
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
              <Repeat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">MPL-Hybrid (MPL-404)</h2>
              <p className="text-xs text-muted-foreground">Solana's ERC-404 — NFT ↔ Token swap escrow</p>
            </div>
            <Badge className="ml-auto bg-primary/15 text-primary border-primary/30 border text-[10px]">
              Solana Only
            </Badge>
          </div>
        </div>
      </div>

      {/* Feature callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: Coins,
            title: "Token → NFT",
            desc: "Holders spend fungible tokens to capture a random NFT from the escrow pool",
            color: "text-green-400",
            bg: "bg-green-500/10",
          },
          {
            icon: ImageIcon,
            title: "NFT → Token",
            desc: "Holders release their NFT back to reclaim fungible tokens",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
          {
            icon: ArrowRightLeft,
            title: "Dynamic Metadata",
            desc: "NFT metadata can re-roll on each swap cycle (path 0) or stay fixed (path 1)",
            color: "text-purple-400",
            bg: "bg-purple-500/10",
          },
        ].map(({ icon: Icon, title, desc, color, bg }) => (
          <Card key={title} className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-sm font-semibold mb-1">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info bar */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <span>
          <strong>Setup order:</strong> (1) Initialize escrow with your collection + token addresses.
          (2) Fund the escrow by transferring NFTs to the derived escrow PDA.
          (3) Share the swap UI with your holders.
        </span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="escrow" className="flex-1 gap-2">
            <ShieldCheck className="w-4 h-4" />
            Initialize Escrow
          </TabsTrigger>
          <TabsTrigger value="swap" className="flex-1 gap-2">
            <Repeat className="w-4 h-4" />
            Swap Interface
          </TabsTrigger>
        </TabsList>

        <TabsContent value="escrow" className="pt-6">
          <HybridEscrowForm onClose={onClose} />
        </TabsContent>

        <TabsContent value="swap" className="pt-6">
          <HybridSwapPanel />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
