import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/providers/WalletProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useSEO } from "@/hooks/useSEO";
import { useWalletNFTs } from "@/hooks/useWalletNFTs";
import { toast } from "sonner";
import { WalletAvatar } from "@/components/wallet/WalletAvatar";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  ExternalLink, 
  Image as ImageIcon,
  History,
  Settings,
  CheckCircle,
  Pencil,
  X,
  RefreshCw,
  Loader2
} from "lucide-react";
import { monadMainnet } from "@/config/alchemy";

// Mock transaction data - in production this would come from an API
const mockTransactions = [
  { id: "1", type: "send", amount: "1.5", to: "0x1234...5678", timestamp: "2024-01-15T10:30:00Z", hash: "0xabc...123" },
  { id: "2", type: "receive", amount: "5.0", from: "0x9876...4321", timestamp: "2024-01-14T15:45:00Z", hash: "0xdef...456" },
  { id: "3", type: "send", amount: "0.25", to: "0x5555...6666", timestamp: "2024-01-13T08:20:00Z", hash: "0xghi...789" },
  { id: "4", type: "receive", amount: "10.0", from: "0x7777...8888", timestamp: "2024-01-12T20:00:00Z", hash: "0xjkl...012" },
];

export default function WalletProfile() {
  const { address, isConnected, balance, chainId, disconnect } = useWallet();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [walletName, setWalletName] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempWalletName, setTempWalletName] = useState("");
  
  // Fetch real NFTs from Alchemy
  const { 
    nfts, 
    totalCount: nftCount, 
    isLoading: nftsLoading, 
    hasMore, 
    loadMore, 
    refresh: refreshNFTs 
  } = useWalletNFTs(address, "eth-mainnet");

  // Load wallet name from localStorage
  useEffect(() => {
    if (address) {
      const savedName = localStorage.getItem(`walletName_${address}`);
      setWalletName(savedName || "My Wallet");
    }
  }, [address]);

  const saveWalletName = () => {
    if (address && tempWalletName.trim()) {
      localStorage.setItem(`walletName_${address}`, tempWalletName.trim());
      setWalletName(tempWalletName.trim());
      setIsEditingName(false);
      toast.success("Wallet name updated");
    }
  };

  const startEditingName = () => {
    setTempWalletName(walletName);
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setTempWalletName("");
    setIsEditingName(false);
  };

  useSEO({
    title: "Wallet Profile | The Lily Pad",
    description: "View your wallet balance, transaction history, and NFT holdings. Manage your connected wallet on The Lily Pad."
  });

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
      
      <main className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-8 sm:pb-12">
        {/* Header Section */}
        <div className="mb-4 sm:mb-8">
          <div className="glass-card p-4 sm:p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-4">
                {address && (
                  <WalletAvatar address={address} size="md" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold mb-0.5">
                    {walletName}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xs sm:text-sm font-mono text-muted-foreground truncate">
                      {formatAddress(address || "")}
                    </span>
                    <button
                      onClick={copyAddress}
                      className="p-1 sm:p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                    >
                      {copied ? (
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      )}
                    </button>
                    <a
                      href={`${monadMainnet.blockExplorers.default.url}/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 sm:p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs sm:text-sm text-muted-foreground truncate">
                      Connected to {monadMainnet.name}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50">
                <div className="text-xs sm:text-sm text-muted-foreground">Balance</div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  {formatBalance(balance)} <span className="text-sm sm:text-lg text-muted-foreground">MON</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <Card className="glass-card border-border/50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground mb-1">Transactions</div>
              {isLoading ? (
                <Skeleton className="h-6 sm:h-8 w-8 sm:w-16" />
              ) : (
                <div className="text-lg sm:text-xl md:text-2xl font-bold">{mockTransactions.length}</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="glass-card border-border/50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground mb-1">NFTs</div>
              {isLoading ? (
                <Skeleton className="h-6 sm:h-8 w-8 sm:w-16" />
              ) : (
                <div className="text-lg sm:text-xl md:text-2xl font-bold">{nftCount}</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="glass-card border-border/50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground mb-1">Chain</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold">{chainId}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 h-10 sm:h-11">
            <TabsTrigger value="transactions" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="nfts" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">NFTs</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="glass-card border-border/50">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Skeleton className="h-3 sm:h-4 w-20 sm:w-32 mb-1.5" />
                          <Skeleton className="h-2.5 sm:h-3 w-16 sm:w-24" />
                        </div>
                        <Skeleton className="h-3 sm:h-4 w-14 sm:w-20 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : mockTransactions.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {mockTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                            tx.type === "send"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {tx.type === "send" ? (
                            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="font-medium text-sm sm:text-base capitalize">{tx.type}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-none">
                              {tx.type === "send" ? `→ ${tx.to}` : `← ${tx.from}`}
                            </span>
                          </div>
                          <div className="text-[10px] sm:text-sm text-muted-foreground">
                            {formatDate(tx.timestamp)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`font-semibold text-sm sm:text-base ${
                              tx.type === "send" ? "text-destructive" : "text-primary"
                            }`}
                          >
                            {tx.type === "send" ? "-" : "+"}{tx.amount}
                          </div>
                          <a
                            href={`${monadMainnet.blockExplorers.default.url}/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 justify-end"
                          >
                            <span className="hidden sm:inline">View</span>
                            <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <History className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">No transactions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NFTs Tab */}
          <TabsContent value="nfts">
            <Card className="glass-card border-border/50">
              <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between">
                <CardTitle className="text-base sm:text-lg">NFT Holdings</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={refreshNFTs}
                  disabled={nftsLoading}
                >
                  {nftsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                {nftsLoading && nfts.length === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-lg sm:rounded-xl overflow-hidden bg-muted">
                        <Skeleton className="aspect-square w-full" />
                        <div className="p-2.5 sm:p-4">
                          <Skeleton className="h-3 sm:h-4 w-16 sm:w-24 mb-1.5" />
                          <Skeleton className="h-2.5 sm:h-3 w-20 sm:w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : nfts.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                      {nfts.map((nft) => (
                        <div
                          key={`${nft.contractAddress}-${nft.tokenId}`}
                          className="rounded-lg sm:rounded-xl overflow-hidden bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                        >
                          {nft.image ? (
                            <div className="aspect-square overflow-hidden">
                              <img
                                src={nft.image}
                                alt={nft.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground/50" />
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground/50 group-hover:scale-110 transition-transform" />
                            </div>
                          )}
                          <div className="p-2.5 sm:p-4">
                            <h3 className="font-semibold text-xs sm:text-base truncate">{nft.name}</h3>
                            <p className="text-[10px] sm:text-sm text-muted-foreground truncate">{nft.collection}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMore && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          onClick={loadMore}
                          disabled={nftsLoading}
                        >
                          {nftsLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            "Load More"
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">No NFTs in your wallet</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      NFTs on Ethereum mainnet will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="glass-card border-border/50">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="font-medium text-sm sm:text-base">Wallet Avatar</h3>
                  {address && (
                    <WalletAvatar address={address} editable />
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="font-medium text-sm sm:text-base">Wallet Name</h3>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={tempWalletName}
                        onChange={(e) => setTempWalletName(e.target.value)}
                        placeholder="Enter wallet name"
                        className="flex-1"
                        maxLength={30}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveWalletName();
                          if (e.key === "Escape") cancelEditingName();
                        }}
                      />
                      <Button size="sm" onClick={saveWalletName} disabled={!tempWalletName.trim()}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEditingName}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-muted">
                      <span className="text-sm sm:text-base flex-1">{walletName}</span>
                      <button
                        onClick={startEditingName}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-background transition-colors shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="font-medium text-sm sm:text-base">Wallet Address</h3>
                  <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-muted">
                    <code className="text-[10px] sm:text-sm flex-1 break-all">{address}</code>
                    <button
                      onClick={copyAddress}
                      className="p-1.5 sm:p-2 rounded-lg hover:bg-background transition-colors shrink-0"
                    >
                      {copied ? (
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="font-medium text-sm sm:text-base">Network</h3>
                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-muted flex-wrap">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary animate-pulse shrink-0" />
                    <span className="text-sm sm:text-base">{monadMainnet.name}</span>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">Chain: {chainId}</Badge>
                  </div>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-border">
                  <Button variant="destructive" onClick={disconnect} size="sm" className="w-full sm:w-auto">
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