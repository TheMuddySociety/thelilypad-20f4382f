import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Image as ImageIcon, RefreshCw, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
}

interface NFTGalleryProps {
  collectionId: string;
  collectionName?: string;
  collectionImage?: string | null;
  contractAddress?: string | null;
  limit?: number;
}

export function NFTGallery({ 
  collectionId, 
  collectionName,
  collectionImage,
  contractAddress,
  limit = 12 
}: NFTGalleryProps) {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNFTs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("minted_nfts")
      .select("*")
      .eq("collection_id", collectionId)
      .order("token_id", { ascending: true })
      .limit(limit);

    if (!error && data) {
      setNfts(data.map(nft => ({
        ...nft,
        attributes: (nft.attributes as { trait_type: string; value: string }[]) || []
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNFTs();
  }, [collectionId, limit]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNFTs();
    setIsRefreshing(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const explorerUrl = (hash: string) => {
    return `https://testnet.monadexplorer.com/tx/${hash}`;
  };

  const tokenExplorerUrl = (tokenId: number) => {
    if (!contractAddress) return null;
    return `https://testnet.monadexplorer.com/token/${contractAddress}?a=${tokenId}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">NFT Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (nfts.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">NFT Gallery</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No NFTs minted yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to mint from this collection!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">NFT Gallery ({nfts.length})</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {nfts.map((nft) => (
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
                ) : collectionImage ? (
                  <img
                    src={collectionImage}
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
                    {nft.name || `${collectionName} #${nft.token_id}`}
                  </p>
                  <p className="text-white/70 text-xs">
                    #{nft.token_id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* NFT Detail Modal */}
      <Dialog open={!!selectedNft} onOpenChange={() => setSelectedNft(null)}>
        <DialogContent className="max-w-2xl">
          {selectedNft && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedNft.name || `${collectionName} #${selectedNft.token_id}`}
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
                  ) : collectionImage ? (
                    <img
                      src={collectionImage}
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

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(explorerUrl(selectedNft.tx_hash), "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View TX
                    </Button>
                    {tokenExplorerUrl(selectedNft.token_id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(tokenExplorerUrl(selectedNft.token_id)!, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Token
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
