import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionHistory } from "@/components/TransactionHistory";
import { NFTTransferModal } from "@/components/NFTTransferModal";
import { ListNFTModal } from "@/components/ListNFTModal";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/providers/WalletProvider";
import { 
  ExternalLink, 
  Image as ImageIcon, 
  RefreshCw, 
  User, 
  Wallet,
  Grid3X3,
  List,
  ArrowUpRight,
  Send,
  Tag,
  XCircle,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface NFT {
  id: string;
  token_id: number;
  name: string | null;
  description: string | null;
  image_url: string | null;
  attributes: { trait_type: string; value: string }[];
  owner_address: string;
  tx_hash: string;
  minted_at: string;
  collection_id: string;
  collection: {
    id: string;
    name: string;
    image_url: string | null;
    contract_address: string | null;
  } | null;
}

interface CollectionStats {
  id: string;
  name: string;
  image_url: string | null;
  count: number;
}

export default function MyNFTs() {
  const navigate = useNavigate();
  const { address, isConnected } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [collectionStats, setCollectionStats] = useState<CollectionStats[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [transferNft, setTransferNft] = useState<NFT | null>(null);
  const [listNft, setListNft] = useState<NFT | null>(null);
  const [listedNftIds, setListedNftIds] = useState<Set<string>>(new Set());
  const [listingsMap, setListingsMap] = useState<Map<string, { id: string; price: number }>>(new Map());
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  useSEO({
    title: "My NFTs | The Lily Pad",
    description: "View your NFT portfolio across all collections on The Lily Pad"
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchNFTs = async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("minted_nfts")
      .select(`
        *,
        collection:collections(id, name, image_url, contract_address)
      `)
      .eq("owner_id", currentUserId)
      .order("minted_at", { ascending: false });

    if (!error && data) {
      const nftData = data.map(nft => ({
        ...nft,
        attributes: (nft.attributes as { trait_type: string; value: string }[]) || [],
        collection: nft.collection as NFT["collection"]
      }));
      setNfts(nftData);

      // Calculate collection stats
      const stats: Record<string, CollectionStats> = {};
      nftData.forEach(nft => {
        if (nft.collection) {
          if (!stats[nft.collection.id]) {
            stats[nft.collection.id] = {
              id: nft.collection.id,
              name: nft.collection.name,
              image_url: nft.collection.image_url,
              count: 0
            };
          }
          stats[nft.collection.id].count++;
        }
      });
      setCollectionStats(Object.values(stats));

      // Fetch active listings for user's NFTs
      const nftIds = nftData.map(nft => nft.id);
      if (nftIds.length > 0) {
        const { data: listings } = await supabase
          .from("nft_listings")
          .select("id, nft_id, price")
          .in("nft_id", nftIds)
          .eq("status", "active");

        if (listings) {
          setListedNftIds(new Set(listings.map(l => l.nft_id)));
          const newListingsMap = new Map<string, { id: string; price: number }>();
          listings.forEach(l => {
            newListingsMap.set(l.nft_id, { id: l.id, price: Number(l.price) });
          });
          setListingsMap(newListingsMap);
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNFTs();
  }, [currentUserId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNFTs();
    setIsRefreshing(false);
  };

  const handleCancelListing = async (nftId: string) => {
    const listing = listingsMap.get(nftId);
    if (!listing) return;

    setIsCancelling(nftId);
    try {
      const { error } = await supabase
        .from("nft_listings")
        .delete()
        .eq("id", listing.id);

      if (error) throw error;

      toast.success("Listing cancelled successfully");
      
      // Update local state
      setListedNftIds(prev => {
        const updated = new Set(prev);
        updated.delete(nftId);
        return updated;
      });
      setListingsMap(prev => {
        const updated = new Map(prev);
        updated.delete(nftId);
        return updated;
      });
    } catch (error) {
      console.error("Error cancelling listing:", error);
      toast.error("Failed to cancel listing");
    } finally {
      setIsCancelling(null);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const explorerUrl = (hash: string) => {
    return `https://testnet.monadexplorer.com/tx/${hash}`;
  };

  const tokenExplorerUrl = (contractAddress: string | null, tokenId: number) => {
    if (!contractAddress) return null;
    return `https://testnet.monadexplorer.com/token/${contractAddress}?a=${tokenId}`;
  };

  const filteredNfts = selectedCollection 
    ? nfts.filter(nft => nft.collection?.id === selectedCollection)
    : nfts;

  // Not logged in state
  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-md mx-auto text-center py-16">
            <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your NFT portfolio
            </p>
            <Button onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My NFTs</h1>
            <p className="text-muted-foreground">
              {isConnected && address && (
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  {formatAddress(address)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Collection Filter */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Collections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={selectedCollection === null ? "secondary" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => setSelectedCollection(null)}
                >
                  <span>All NFTs</span>
                  <Badge variant="outline">{nfts.length}</Badge>
                </Button>
                {collectionStats.map((collection) => (
                  <Button
                    key={collection.id}
                    variant={selectedCollection === collection.id ? "secondary" : "ghost"}
                    className="w-full justify-between"
                    onClick={() => setSelectedCollection(collection.id)}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {collection.image_url ? (
                        <img 
                          src={collection.image_url} 
                          alt={collection.name}
                          className="w-5 h-5 rounded object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="w-3 h-3" />
                        </div>
                      )}
                      <span className="truncate">{collection.name}</span>
                    </span>
                    <Badge variant="outline">{collection.count}</Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Transaction History */}
            <TransactionHistory userId={currentUserId} limit={5} />
          </div>

          {/* Main Content - NFT Grid/List */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                : "space-y-3"
              }>
                {[...Array(8)].map((_, i) => (
                  <Skeleton 
                    key={i} 
                    className={viewMode === "grid" ? "aspect-square rounded-lg" : "h-20 rounded-lg"} 
                  />
                ))}
              </div>
            ) : filteredNfts.length === 0 ? (
              <div className="text-center py-16">
                <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No NFTs Found</h2>
                <p className="text-muted-foreground mb-6">
                  {selectedCollection 
                    ? "You don't have any NFTs from this collection"
                    : "Start minting NFTs to build your collection"
                  }
                </p>
                <Button onClick={() => navigate("/launchpad")}>
                  Explore Collections
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredNfts.map((nft) => (
                  <div
                    key={nft.id}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => setSelectedNft(nft)}
                  >
                    {nft.image_url ? (
                      <img
                        src={nft.image_url}
                        alt={nft.name || `#${nft.token_id}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : nft.collection?.image_url ? (
                      <img
                        src={nft.collection.image_url}
                        alt={nft.name || `#${nft.token_id}`}
                        className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-white font-medium text-sm truncate">
                        {nft.name || `${nft.collection?.name} #${nft.token_id}`}
                      </p>
                      <p className="text-white/70 text-xs">
                        {nft.collection?.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNfts.map((nft) => (
                  <div
                    key={nft.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => setSelectedNft(nft)}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {nft.image_url ? (
                        <img
                          src={nft.image_url}
                          alt={nft.name || `#${nft.token_id}`}
                          className="w-full h-full object-cover"
                        />
                      ) : nft.collection?.image_url ? (
                        <img
                          src={nft.collection.image_url}
                          alt={nft.name || `#${nft.token_id}`}
                          className="w-full h-full object-cover opacity-50"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {nft.name || `${nft.collection?.name} #${nft.token_id}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {nft.collection?.name} · Token #{nft.token_id}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(nft.minted_at), { addSuffix: true })}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/launchpad/${nft.collection_id}`);
                      }}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* NFT Detail Modal */}
      <Dialog open={!!selectedNft} onOpenChange={() => setSelectedNft(null)}>
        <DialogContent className="max-w-2xl">
          {selectedNft && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedNft.name || `${selectedNft.collection?.name} #${selectedNft.token_id}`}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  {selectedNft.image_url ? (
                    <img
                      src={selectedNft.image_url}
                      alt={selectedNft.name || `#${selectedNft.token_id}`}
                      className="w-full h-full object-cover"
                    />
                  ) : selectedNft.collection?.image_url ? (
                    <img
                      src={selectedNft.collection.image_url}
                      alt={selectedNft.name || `#${selectedNft.token_id}`}
                      className="w-full h-full object-cover opacity-50"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      Token #{selectedNft.token_id}
                    </Badge>
                    {selectedNft.collection && (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-primary"
                        onClick={() => {
                          setSelectedNft(null);
                          navigate(`/launchpad/${selectedNft.collection_id}`);
                        }}
                      >
                        {selectedNft.collection.name}
                        <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    {selectedNft.description && (
                      <p className="text-muted-foreground text-sm mt-2">
                        {selectedNft.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Owner:</span>
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {formatAddress(selectedNft.owner_address)}
                      </code>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Minted {formatDistanceToNow(new Date(selectedNft.minted_at), { addSuffix: true })}
                    </div>
                  </div>

                  {selectedNft.attributes.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Attributes</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedNft.attributes.map((attr, i) => (
                          <div 
                            key={i}
                            className="bg-muted/50 rounded-lg p-2 text-center"
                          >
                            <p className="text-xs text-muted-foreground uppercase">
                              {attr.trait_type}
                            </p>
                            <p className="font-medium text-sm truncate">
                              {attr.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    {/* List for Sale Button */}
                    {!listedNftIds.has(selectedNft.id) ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedNft(null);
                          setListNft(selectedNft);
                        }}
                      >
                        <Tag className="w-4 h-4 mr-2" />
                        List for Sale
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary" className="w-full justify-center py-2">
                          Listed for {listingsMap.get(selectedNft.id)?.price.toFixed(2)} MON
                        </Badge>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => handleCancelListing(selectedNft.id)}
                          disabled={isCancelling === selectedNft.id}
                        >
                          {isCancelling === selectedNft.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                          )}
                          Cancel Listing
                        </Button>
                      </div>
                    )}
                    
                    {/* Transfer Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedNft(null);
                        setTransferNft(selectedNft);
                      }}
                      disabled={listedNftIds.has(selectedNft.id)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Transfer NFT
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(explorerUrl(selectedNft.tx_hash), "_blank")}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View TX
                      </Button>
                      {tokenExplorerUrl(selectedNft.collection?.contract_address || null, selectedNft.token_id) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(tokenExplorerUrl(selectedNft.collection?.contract_address || null, selectedNft.token_id)!, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Token
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <NFTTransferModal
        open={!!transferNft}
        onOpenChange={(open) => !open && setTransferNft(null)}
        nft={transferNft}
        onTransferSuccess={() => {
          toast.success("NFT transferred successfully!");
          setTransferNft(null);
          fetchNFTs();
        }}
      />

      {/* List Modal */}
      <ListNFTModal
        nft={listNft ? {
          id: listNft.id,
          token_id: listNft.token_id,
          name: listNft.name,
          image_url: listNft.image_url,
          collection_id: listNft.collection_id,
          owner_address: listNft.owner_address,
          owner_id: currentUserId || ""
        } : null}
        open={!!listNft}
        onOpenChange={(open) => !open && setListNft(null)}
        onSuccess={() => {
          setListNft(null);
          fetchNFTs();
        }}
      />
    </div>
  );
}
