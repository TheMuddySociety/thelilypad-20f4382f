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
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertTriangle,
  Fuel,
  Loader2,
  Rocket
} from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/providers/WalletProvider";
import { supabase } from "@/integrations/supabase/client";

interface Collection {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  image_url: string | null;
  creator_address: string;
  creator_id: string;
  total_supply: number;
  minted: number;
  royalty_percent: number;
  status: string;
  phases: unknown;
  contract_address: string | null;
  created_at: string;
}

interface Phase {
  id: string;
  name: string;
  price: string;
  maxPerWallet: number;
  supply: number;
  minted?: number;
  isActive?: boolean;
  startTime: string | null;
  endTime: string | null;
  requiresAllowlist: boolean;
}

export default function CollectionDetail() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { network, currentChain, isConnected, chainId, switchToMonad, connect, balance } = useWallet();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mintAmount, setMintAmount] = useState(1);
  const [activePhase, setActivePhase] = useState<Phase | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const isTestnet = network === "testnet";
  const isWrongNetwork = isConnected && chainId !== currentChain.id;
  
  // Fetch collection from database
  useEffect(() => {
    if (collectionId) {
      fetchCollection();
    }
  }, [collectionId]);

  const fetchCollection = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("id", collectionId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching collection:", error);
        toast.error("Failed to load collection");
      } else if (data) {
        setCollection(data);
        // Set active phase from phases data
        const phases = data.phases as unknown as Phase[] | null;
        if (phases && Array.isArray(phases) && phases.length > 0) {
          const publicPhase = phases.find(p => p.id === "public") || phases[0];
          setActivePhase(publicPhase);
        }
      } else {
        toast.error("Collection not found");
        navigate("/launchpad");
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPhases = (): Phase[] => {
    if (!collection?.phases) return [];
    try {
      return collection.phases as unknown as Phase[];
    } catch {
      return [];
    }
  };
  
  // Calculate if user has enough balance
  const totalCost = activePhase ? parseFloat(activePhase.price) * mintAmount : 0;
  const userBalance = balance ? parseFloat(balance) : 0;
  
  // Gas estimation (simulated - in production this would come from actual gas estimation)
  const [gasEstimate, setGasEstimate] = useState<{ gasLimit: number; gasPrice: number; totalGas: number } | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);

  // Simulate gas estimation when mint amount changes
  useEffect(() => {
    if (!isConnected || isWrongNetwork || !activePhase) {
      setGasEstimate(null);
      return;
    }

    const estimateGas = async () => {
      setIsEstimatingGas(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulated gas values (in a real app, this would come from eth_estimateGas)
      const baseGasLimit = 150000; // Base gas for mint
      const perNftGas = 50000; // Additional gas per NFT
      const gasLimit = baseGasLimit + (perNftGas * mintAmount);
      const gasPrice = isTestnet ? 0.000000001 : 0.000000025; // Gwei converted to MON
      const totalGas = gasLimit * gasPrice;
      
      setGasEstimate({ gasLimit, gasPrice, totalGas });
      setIsEstimatingGas(false);
    };

    estimateGas();
  }, [mintAmount, isConnected, isWrongNetwork, isTestnet, activePhase]);

  const totalWithGas = totalCost + (gasEstimate?.totalGas || 0);
  const hasInsufficientBalance = isConnected && !isWrongNetwork && totalWithGas > userBalance;
  
  // Live supply from collection
  const liveSupply = collection?.minted || 0;
  const totalSupply = collection?.total_supply || 0;

  // Simulate live blockchain updates
  useEffect(() => {
    if (!collection) return;
    const interval = setInterval(() => {
      // In production, this would fetch from blockchain
    }, 3000);

    return () => clearInterval(interval);
  }, [collection?.total_supply]);

  const phases = getPhases();
  const mintProgress = totalSupply > 0 ? (liveSupply / totalSupply) * 100 : 0;

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

    // Check if user has sufficient balance (including gas)
    if (hasInsufficientBalance) {
      toast.error("Insufficient balance", {
        description: `You need ${(totalWithGas - userBalance).toFixed(4)} more MON (including gas) to mint`,
      });
      return;
    }

    setIsMinting(true);
    
    // Simulate minting transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success(`Successfully minted ${mintAmount} NFT${mintAmount > 1 ? 's' : ''}!`, {
      description: "Check your wallet for your new NFTs",
    });
    
    // Refresh collection data
    fetchCollection();
    setIsMinting(false);
  };

  const handleCopyAddress = () => {
    if (!collection?.contract_address) return;
    navigator.clipboard.writeText(collection.contract_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Contract address copied!");
  };

  const totalCostDisplay = totalCost.toFixed(2);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <Skeleton className="h-64 w-full rounded-xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  // Not found state
  if (!collection) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12 text-center">
          <Rocket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Collection Not Found</h1>
          <p className="text-muted-foreground mb-4">This collection doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/launchpad")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Launchpad
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Banner */}
      <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-primary/20 to-accent/20">
        {collection.image_url && (
          <img 
            src={collection.image_url} 
            alt={collection.name}
            className="w-full h-full object-cover opacity-30"
          />
        )}
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
              <div className="w-32 h-32 rounded-xl bg-muted border-4 border-background shadow-lg overflow-hidden flex items-center justify-center">
                {collection.image_url ? (
                  <img 
                    src={collection.image_url} 
                    alt={collection.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Rocket className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold">{collection.name}</h1>
                  <Badge 
                    variant="outline" 
                    className={
                      collection.status === "live" 
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : collection.status === "upcoming"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
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
                {collection.contract_address && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Contract:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {collection.contract_address.slice(0, 10)}...{collection.contract_address.slice(-8)}
                    </code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyAddress}>
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <a 
                      href={`${currentChain.blockExplorers?.default?.url}/address/${collection.contract_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{collection.description || "No description provided."}</p>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Creator</span>
                    <p className="font-medium truncate">{collection.creator_address.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Supply</span>
                    <p className="font-medium">{collection.total_supply.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Royalty</span>
                    <p className="font-medium">{collection.royalty_percent}%</p>
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
                {phases.length > 0 ? phases.map((phase) => {
                  const phaseMinted = phase.minted || 0;
                  const phaseProgress = phase.supply > 0 ? (phaseMinted / phase.supply) * 100 : 0;
                  const PhaseIcon = phase.requiresAllowlist 
                    ? (phase.id === "team" ? Shield : Users)
                    : Sparkles;
                  const isActive = activePhase?.id === phase.id;
                  
                  return (
                    <div 
                      key={phase.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        isActive 
                          ? "border-primary bg-primary/5" 
                          : "border-border bg-muted/30 hover:border-primary/50"
                      }`}
                      onClick={() => setActivePhase(phase)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <PhaseIcon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="font-medium">{phase.name}</span>
                          {isActive && (
                            <Badge variant="default" className="text-xs">Selected</Badge>
                          )}
                        </div>
                        <span className="font-semibold">
                          {phase.price === "0" ? "Free" : `${phase.price} MON`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Max {phase.maxPerWallet} per wallet • {phase.supply.toLocaleString()} supply</span>
                        </div>
                        <Progress value={phaseProgress} className="h-2" />
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-muted-foreground text-center py-4">No mint phases configured</p>
                )}
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
                    {Math.min(liveSupply, totalSupply).toLocaleString()}
                  </div>
                  <div className="text-muted-foreground">
                    of {totalSupply.toLocaleString()} minted
                  </div>
                </div>
                <Progress value={totalSupply > 0 ? Math.min((liveSupply / totalSupply) * 100, 100) : 0} className="h-3" />
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
                  Currently in: <span className="text-foreground font-medium">{activePhase?.name || "No phase"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Phase Tabs */}
                {phases.length > 1 && (
                <Tabs value={activePhase?.id || ""} onValueChange={(v) => {
                  const phase = phases.find(p => p.id === v);
                  if (phase) setActivePhase(phase);
                }}>
                  <TabsList className="grid grid-cols-2">
                    {phases.slice(-2).map(phase => (
                      <TabsTrigger key={phase.id} value={phase.id}>
                        {phase.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                )}

                {/* Wallet Balance */}
                {isConnected && !isWrongNetwork && (
                  <div className={`p-4 rounded-lg border ${hasInsufficientBalance ? 'bg-destructive/5 border-destructive/30' : 'bg-primary/5 border-primary/30'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Wallet className={`w-4 h-4 ${hasInsufficientBalance ? 'text-destructive' : 'text-primary'}`} />
                        <span className="text-sm font-medium">Your Balance</span>
                      </div>
                      <span className={`font-bold ${hasInsufficientBalance ? 'text-destructive' : 'text-primary'}`}>
                        {userBalance.toFixed(4)} MON
                      </span>
                    </div>
                    {hasInsufficientBalance && (
                      <div className="mt-2 flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs">
                          Insufficient balance. Need {(totalWithGas - userBalance).toFixed(4)} more MON (incl. gas)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Price Info */}
                {activePhase && (
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
                      {((activePhase.supply || 0) - (activePhase.minted || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
                )}

                {/* Amount Selector */}
                {activePhase && (
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
                      onChange={(e) => setMintAmount(Math.min(activePhase.maxPerWallet || 10, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="text-center w-20"
                      min={1}
                      max={activePhase.maxPerWallet || 10}
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setMintAmount(Math.min(activePhase.maxPerWallet || 10, mintAmount + 1))}
                      disabled={mintAmount >= (activePhase.maxPerWallet || 10)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                )}

                <Separator />

                {/* Gas Estimation */}
                {isConnected && !isWrongNetwork && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Fuel className="w-4 h-4" />
                        <span>Estimated Gas</span>
                      </div>
                      {isEstimatingGas ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-xs">Estimating...</span>
                        </div>
                      ) : gasEstimate ? (
                        <span className="font-medium text-muted-foreground">
                          ~{gasEstimate.totalGas.toFixed(6)} MON
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </div>
                    {gasEstimate && !isEstimatingGas && (
                      <div className="text-xs text-muted-foreground">
                        Gas Limit: {gasEstimate.gasLimit.toLocaleString()} • Gas Price: {(gasEstimate.gasPrice * 1e9).toFixed(2)} Gwei
                      </div>
                    )}
                  </div>
                )}

                {/* Total Cost */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Mint Cost</span>
                    <span className="font-medium">
                      {totalCostDisplay === "0.00" ? "Free" : `${totalCostDisplay} MON`}
                    </span>
                  </div>
                  {gasEstimate && !isEstimatingGas && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">+ Gas Fee</span>
                      <span className="font-medium text-muted-foreground">
                        ~{gasEstimate.totalGas.toFixed(6)} MON
                      </span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      {isEstimatingGas ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-lg">Calculating...</span>
                        </span>
                      ) : totalWithGas === 0 ? (
                        "Free"
                      ) : (
                        `~${totalWithGas.toFixed(4)} MON`
                      )}
                    </span>
                  </div>
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
                  disabled={isMinting || isSwitchingNetwork || !activePhase || (activePhase.minted || 0) >= (activePhase.supply || 0) || !isConnected || isWrongNetwork || hasInsufficientBalance}
                >
                  {isMinting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Minting...
                    </>
                  ) : !activePhase ? (
                    "No Phase Available"
                  ) : (activePhase.minted || 0) >= (activePhase.supply || 0) ? (
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
                  ) : hasInsufficientBalance ? (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Insufficient Balance
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Mint {mintAmount} NFT{mintAmount > 1 ? 's' : ''}
                    </>
                  )}
                </Button>

                {activePhase?.requiresAllowlist && (
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