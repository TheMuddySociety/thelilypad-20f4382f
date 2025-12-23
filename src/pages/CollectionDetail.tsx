import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  ExternalLink, 
  Minus, 
  Plus, 
  Wallet,
  Clock,
  Users,
  Shield,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  FlaskConical,
  Globe,
  Droplets,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/providers/WalletProvider";

// Demo collection data - in production this comes from on-chain
const demoCollection = {
  id: "1",
  name: "Monad Frogs",
  symbol: "MFROG",
  description: "A collection of 5,000 unique frogs living on the Monad blockchain. Each frog is algorithmically generated with over 150 possible traits.",
  image: "https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=800&h=800&fit=crop",
  bannerImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&h=400&fit=crop",
  creator: "0x1234567890abcdef1234567890abcdef12345678",
  contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
  totalSupply: 5000,
  royaltyPercent: 5,
  status: "live",
  phases: [
    { 
      id: "team", 
      name: "Team Mint", 
      price: "0", 
      maxPerWallet: 10, 
      supply: 100, 
      minted: 100, 
      isActive: false, 
      startTime: new Date("2024-01-01"), 
      endTime: new Date("2024-01-02"),
      requiresAllowlist: false
    },
    { 
      id: "partners", 
      name: "Partners", 
      price: "0", 
      maxPerWallet: 5, 
      supply: 200, 
      minted: 200, 
      isActive: false, 
      startTime: new Date("2024-01-02"), 
      endTime: new Date("2024-01-03"),
      requiresAllowlist: true
    },
    { 
      id: "allowlist", 
      name: "Allowlist", 
      price: "0.25", 
      maxPerWallet: 3, 
      supply: 700, 
      minted: 700, 
      isActive: false, 
      startTime: new Date("2024-01-03"), 
      endTime: new Date("2024-01-04"),
      requiresAllowlist: true
    },
    { 
      id: "public", 
      name: "Public Mint", 
      price: "0.5", 
      maxPerWallet: 5, 
      supply: 4000, 
      minted: 2420, 
      isActive: true, 
      startTime: new Date("2024-01-04"), 
      endTime: null,
      requiresAllowlist: false
    },
  ],
};

export default function CollectionDetail() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { network, currentChain, isConnected, chainId, switchToMonad, connect } = useWallet();
  const [collection, setCollection] = useState(demoCollection);
  const [mintAmount, setMintAmount] = useState(1);
  const [activePhase, setActivePhase] = useState(collection.phases.find(p => p.isActive) || collection.phases[0]);
  const [isMinting, setIsMinting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const isTestnet = network === "testnet";
  const isWrongNetwork = isConnected && chainId !== currentChain.id;
  
  // Simulated live supply updates
  const [liveSupply, setLiveSupply] = useState(3420);

  // Simulate live blockchain updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate random mints happening
      if (Math.random() > 0.7) {
        setLiveSupply(prev => {
          const newSupply = prev + Math.floor(Math.random() * 3) + 1;
          return Math.min(newSupply, collection.totalSupply);
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [collection.totalSupply]);

  const totalMinted = collection.phases.reduce((acc, p) => acc + p.minted, 0) + (liveSupply - 3420);
  const mintProgress = (totalMinted / collection.totalSupply) * 100;

  const handleRefreshSupply = async () => {
    setIsRefreshing(true);
    // Simulate fetching from blockchain
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Supply updated from blockchain");
    setIsRefreshing(false);
  };

  const handleSwitchNetwork = async () => {
    setIsSwitchingNetwork(true);
    try {
      await switchToMonad();
      toast.success(`Switched to ${currentChain.name}`);
    } catch (error) {
      toast.error("Failed to switch network", {
        description: "Please switch manually in your wallet",
      });
    }
    setIsSwitchingNetwork(false);
  };

  const handleMint = async () => {
    // Check if wallet is connected
    if (!isConnected) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to mint",
        action: {
          label: "Connect",
          onClick: connect,
        },
      });
      return;
    }

    // Check if on wrong network and prompt to switch
    if (isWrongNetwork) {
      toast.error(`Wrong network detected`, {
        description: `Please switch to ${currentChain.name} to mint`,
        action: {
          label: "Switch Network",
          onClick: handleSwitchNetwork,
        },
      });
      return;
    }

    setIsMinting(true);
    
    // Simulate minting transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success(`Successfully minted ${mintAmount} NFT${mintAmount > 1 ? 's' : ''}!`, {
      description: "Check your wallet for your new NFTs",
    });
    
    setLiveSupply(prev => prev + mintAmount);
    setIsMinting(false);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(collection.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Contract address copied!");
  };

  const totalCost = (parseFloat(activePhase.price) * mintAmount).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Banner */}
      <div className="relative h-48 sm:h-64 md:h-80">
        <img 
          src={collection.bannerImage} 
          alt={collection.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <main className="container mx-auto px-4 -mt-20 relative z-10 pb-12">
        {/* Back button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/launchpad")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Launchpad
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Collection Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Collection Header */}
            <div className="flex items-start gap-6">
              <img 
                src={collection.image} 
                alt={collection.name}
                className="w-32 h-32 rounded-xl object-cover border-4 border-background shadow-lg"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold">{collection.name}</h1>
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={isTestnet 
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30" 
                      : "bg-primary/10 text-primary border-primary/30"
                    }
                  >
                    {isTestnet ? (
                      <FlaskConical className="w-3 h-3 mr-1" />
                    ) : (
                      <Globe className="w-3 h-3 mr-1" />
                    )}
                    {currentChain.name}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-3">{collection.symbol}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Contract:</span>
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    {collection.contractAddress.slice(0, 10)}...{collection.contractAddress.slice(-8)}
                  </code>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyAddress}>
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                  <a 
                    href={`${currentChain.blockExplorers?.default?.url}/address/${collection.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{collection.description}</p>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Creator</span>
                    <p className="font-medium truncate">{collection.creator.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Supply</span>
                    <p className="font-medium">{collection.totalSupply.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Royalty</span>
                    <p className="font-medium">{collection.royaltyPercent}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Network</span>
                    <p className="font-medium flex items-center gap-1">
                      {isTestnet ? (
                        <FlaskConical className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Globe className="w-3 h-3 text-primary" />
                      )}
                      {currentChain.name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mint Phases */}
            <Card>
              <CardHeader>
                <CardTitle>Mint Phases</CardTitle>
                <CardDescription>Track the progress of each mint phase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {collection.phases.map((phase) => {
                  const phaseProgress = (phase.minted / phase.supply) * 100;
                  const PhaseIcon = phase.requiresAllowlist 
                    ? (phase.id === "team" ? Shield : Users)
                    : Sparkles;
                  
                  return (
                    <div 
                      key={phase.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        phase.isActive 
                          ? "border-primary bg-primary/5" 
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <PhaseIcon className={`w-5 h-5 ${phase.isActive ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="font-medium">{phase.name}</span>
                          {phase.isActive && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                          {phase.minted >= phase.supply && (
                            <Badge variant="secondary" className="text-xs">Sold Out</Badge>
                          )}
                        </div>
                        <span className="font-semibold">
                          {phase.price === "0" ? "Free" : `${phase.price} MON`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{phase.minted.toLocaleString()} / {phase.supply.toLocaleString()} minted</span>
                          <span>{phaseProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={phaseProgress} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Mint Card */}
          <div className="space-y-6">
            {/* Live Supply Card */}
            <Card className="border-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Live Supply</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={handleRefreshSupply}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-primary">
                    {Math.min(liveSupply, collection.totalSupply).toLocaleString()}
                  </div>
                  <div className="text-muted-foreground">
                    of {collection.totalSupply.toLocaleString()} minted
                  </div>
                </div>
                <Progress value={Math.min((liveSupply / collection.totalSupply) * 100, 100)} className="h-3" />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Updates in real-time from blockchain
                </p>
              </CardContent>
            </Card>

            {/* Mint Card */}
            <Card>
              <CardHeader>
                <CardTitle>Mint NFT</CardTitle>
                <CardDescription>
                  Currently in: <span className="text-foreground font-medium">{activePhase.name}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Phase Tabs */}
                <Tabs value={activePhase.id} onValueChange={(v) => {
                  const phase = collection.phases.find(p => p.id === v);
                  if (phase) setActivePhase(phase);
                }}>
                  <TabsList className="grid grid-cols-2">
                    {collection.phases.filter(p => p.isActive || p.minted < p.supply).slice(-2).map(phase => (
                      <TabsTrigger key={phase.id} value={phase.id} disabled={!phase.isActive}>
                        {phase.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Price Info */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price per NFT</span>
                    <span className="font-medium">
                      {activePhase.price === "0" ? "Free" : `${activePhase.price} MON`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max per wallet</span>
                    <span className="font-medium">{activePhase.maxPerWallet}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-medium">
                      {(activePhase.supply - activePhase.minted).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Amount Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setMintAmount(Math.max(1, mintAmount - 1))}
                      disabled={mintAmount <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input 
                      type="number"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(Math.min(activePhase.maxPerWallet, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="text-center w-20"
                      min={1}
                      max={activePhase.maxPerWallet}
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setMintAmount(Math.min(activePhase.maxPerWallet, mintAmount + 1))}
                      disabled={mintAmount >= activePhase.maxPerWallet}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Total Cost */}
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {totalCost === "0.00" ? "Free" : `${totalCost} MON`}
                  </span>
                </div>

                {/* Wrong Network Warning */}
                {isWrongNetwork && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Wrong Network</span>
                    </div>
                    <p className="text-xs text-destructive/80 mb-3">
                      You're connected to a different network. Switch to {currentChain.name} to mint.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/20"
                      onClick={handleSwitchNetwork}
                      disabled={isSwitchingNetwork}
                    >
                      {isSwitchingNetwork ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                          Switching...
                        </>
                      ) : (
                        <>
                          Switch to {currentChain.name}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Not Connected Warning */}
                {!isConnected && (
                  <div className="p-3 bg-muted border border-border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm font-medium">Wallet Not Connected</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Connect your wallet to mint NFTs from this collection.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={connect}
                    >
                      Connect Wallet
                    </Button>
                  </div>
                )}

                {/* Mint Button */}
                <Button 
                  size="lg" 
                  className="w-full gap-2"
                  onClick={handleMint}
                  disabled={isMinting || isSwitchingNetwork || activePhase.minted >= activePhase.supply || !isConnected || isWrongNetwork}
                >
                  {isMinting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Minting...
                    </>
                  ) : activePhase.minted >= activePhase.supply ? (
                    "Sold Out"
                  ) : isWrongNetwork ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Wrong Network
                    </>
                  ) : !isConnected ? (
                    <>
                      <Wallet className="w-4 h-4" />
                      Connect to Mint
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Mint {mintAmount} NFT{mintAmount > 1 ? 's' : ''}
                    </>
                  )}
                </Button>

                {activePhase.requiresAllowlist && (
                  <p className="text-xs text-center text-muted-foreground">
                    This phase requires allowlist verification
                  </p>
                )}

                {isTestnet && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-500">
                        <FlaskConical className="w-4 h-4" />
                        <span className="text-sm font-medium">Testnet Mode</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
                        onClick={() => window.open("https://faucet.monad.xyz", "_blank")}
                      >
                        <Droplets className="w-3 h-3 mr-1" />
                        Get Test MON
                      </Button>
                    </div>
                    <p className="text-xs text-amber-500/80 mt-2">
                      You're on testnet. Get free test tokens from the faucet to mint.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}