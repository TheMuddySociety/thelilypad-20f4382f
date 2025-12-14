import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/providers/WalletProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  ExternalLink, 
  Image as ImageIcon,
  History,
  Settings,
  CheckCircle
} from "lucide-react";
import { monadMainnet } from "@/config/alchemy";

// Mock transaction data - in production this would come from an API
const mockTransactions = [
  { id: "1", type: "send", amount: "1.5", to: "0x1234...5678", timestamp: "2024-01-15T10:30:00Z", hash: "0xabc...123" },
  { id: "2", type: "receive", amount: "5.0", from: "0x9876...4321", timestamp: "2024-01-14T15:45:00Z", hash: "0xdef...456" },
  { id: "3", type: "send", amount: "0.25", to: "0x5555...6666", timestamp: "2024-01-13T08:20:00Z", hash: "0xghi...789" },
  { id: "4", type: "receive", amount: "10.0", from: "0x7777...8888", timestamp: "2024-01-12T20:00:00Z", hash: "0xjkl...012" },
];

// Mock NFT data - in production this would come from Alchemy NFT API
const mockNFTs = [
  { id: "1", name: "Lily Pad #001", collection: "Lily Pad Genesis", image: "/placeholder.svg" },
  { id: "2", name: "Monad Frog #042", collection: "Monad Frogs", image: "/placeholder.svg" },
  { id: "3", name: "Stream Pass #123", collection: "Creator Passes", image: "/placeholder.svg" },
];

export default function WalletProfile() {
  const { address, isConnected, balance, chainId, disconnect } = useWallet();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string, full = false) => {
    if (full) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: string | null) => {
    if (!bal) return "0.00";
    return parseFloat(bal).toFixed(4);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header Section */}
        <div className="mb-8">
          <div className="glass-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
                  <Wallet className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-bold font-mono">
                      {formatAddress(address || "")}
                    </h1>
                    <button
                      onClick={copyAddress}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <a
                      href={`${monadMainnet.blockExplorers.default.url}/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">
                      Connected to {monadMainnet.name}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:items-end gap-2">
                <div className="text-sm text-muted-foreground">Balance</div>
                <div className="text-3xl md:text-4xl font-bold">
                  {formatBalance(balance)} <span className="text-lg text-muted-foreground">MON</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{mockTransactions.length}</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">NFTs Owned</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{mockNFTs.length}</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Chain ID</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{chainId}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="nfts" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">NFTs</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : mockTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {mockTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === "send"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {tx.type === "send" ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{tx.type}</span>
                            <Badge variant="secondary" className="text-xs">
                              {tx.type === "send" ? `To: ${tx.to}` : `From: ${tx.from}`}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(tx.timestamp)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-semibold ${
                              tx.type === "send" ? "text-destructive" : "text-primary"
                            }`}
                          >
                            {tx.type === "send" ? "-" : "+"}{tx.amount} MON
                          </div>
                          <a
                            href={`${monadMainnet.blockExplorers.default.url}/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 justify-end"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NFTs Tab */}
          <TabsContent value="nfts">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>NFT Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl overflow-hidden bg-muted">
                        <Skeleton className="aspect-square w-full" />
                        <div className="p-4">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : mockNFTs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockNFTs.map((nft) => (
                      <div
                        key={nft.id}
                        className="rounded-xl overflow-hidden bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                      >
                        <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground/50 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold">{nft.name}</h3>
                          <p className="text-sm text-muted-foreground">{nft.collection}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No NFTs in your wallet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-medium">Wallet Address</h3>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <code className="text-sm flex-1 break-all">{address}</code>
                    <button
                      onClick={copyAddress}
                      className="p-2 rounded-lg hover:bg-background transition-colors"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Network</h3>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                    <span>{monadMainnet.name}</span>
                    <Badge variant="secondary">Chain ID: {chainId}</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button variant="destructive" onClick={disconnect}>
                    Disconnect Wallet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}