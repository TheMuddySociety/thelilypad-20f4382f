import { useParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useWalletNFTs, NFT } from '@/hooks/useWalletNFTs';
import { useSEO } from '@/hooks/useSEO';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WalletNFTDetailModal } from '@/components/wallet/WalletNFTDetailModal';
import {
  Lock, Twitter, Youtube, MessageCircle, Instagram, Music2, ExternalLink, Image as ImageIcon, User
} from 'lucide-react';
import { useState, useMemo } from 'react';

const socialIcons: Record<string, typeof Twitter> = {
  twitter: Twitter,
  youtube: Youtube,
  discord: MessageCircle,
  instagram: Instagram,
  tiktok: Music2,
};

export default function PublicProfile() {
  const { identifier } = useParams<{ identifier: string }>();
  const { profile, linkedWallets, loading, error } = usePublicProfile(identifier);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);

  // Gather all wallet addresses for NFT fetching
  const allAddresses = useMemo(() => {
    if (!profile) return [];
    const addrs = [profile.wallet_address];
    linkedWallets.forEach(w => {
      if (!addrs.includes(w.wallet_address)) addrs.push(w.wallet_address);
    });
    return addrs;
  }, [profile, linkedWallets]);

  // Fetch NFTs for the primary wallet (Solana mainnet)
  const primaryAddress = allAddresses[0] || null;
  const { nfts, isLoading: nftsLoading } = useWalletNFTs(
    profile && !(profile as any).is_private ? primaryAddress : null,
    'solana-mainnet'
  );

  const displayName = profile?.display_name || profile?.wallet_address?.slice(0, 8) + '...';

  useSEO({
    title: profile ? `${displayName} | The Lily Pad` : 'Profile | The Lily Pad',
    description: profile?.bio || `Check out ${displayName}'s profile on The Lily Pad`,
  });

  const socials = profile ? [
    { key: 'twitter', value: profile.social_twitter },
    { key: 'youtube', value: profile.social_youtube },
    { key: 'discord', value: profile.social_discord },
    { key: 'instagram', value: profile.social_instagram },
    { key: 'tiktok', value: profile.social_tiktok },
  ].filter(s => s.value) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
          <Skeleton className="h-48 w-full rounded-xl mb-6" />
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl text-center">
          <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-muted-foreground">This user doesn't exist or their profile is unavailable.</p>
        </main>
      </div>
    );
  }

  const isPrivate = (profile as any).is_private;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        {/* Banner */}
        {profile.banner_url ? (
          <div className="h-48 md:h-56 rounded-xl overflow-hidden mb-6 bg-muted">
            <img
              src={profile.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-32 rounded-xl mb-6 bg-gradient-to-r from-primary/20 to-accent/20" />
        )}

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 -mt-12 sm:-mt-14 px-4">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="text-2xl bg-primary/20 text-primary">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {profile.is_verified && (
                <Badge className="bg-primary/20 text-primary border-primary/30">Verified</Badge>
              )}
              {profile.is_creator && (
                <Badge variant="outline" className="text-xs">Creator</Badge>
              )}
              {profile.is_streamer && (
                <Badge variant="outline" className="text-xs">Streamer</Badge>
              )}
            </div>
            {profile.bio && (
              <p className="text-muted-foreground mt-1 text-sm max-w-lg">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Socials */}
        {socials.length > 0 && (
          <div className="flex gap-2 mb-8 flex-wrap px-4">
            {socials.map(({ key, value }) => {
              const Icon = socialIcons[key] || ExternalLink;
              return (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  asChild
                >
                  <a
                    href={value!.startsWith('http') ? value! : `https://${value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </a>
                </Button>
              );
            })}
          </div>
        )}

        {/* Linked Wallets Badges */}
        {linkedWallets.length > 0 && (
          <div className="flex gap-2 mb-8 flex-wrap px-4">
            {linkedWallets.map(w => (
              <Badge key={w.id} variant="outline" className="font-mono text-xs">
                {w.chain.toUpperCase()} · {w.wallet_address.slice(0, 6)}...{w.wallet_address.slice(-4)}
              </Badge>
            ))}
          </div>
        )}

        {/* NFT Grid or Private Notice */}
        {isPrivate ? (
          <div className="text-center py-16">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold mb-1">Private Collection</h2>
            <p className="text-muted-foreground text-sm">
              This user has chosen to keep their NFT portfolio private.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 px-4">
              <ImageIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">NFT Collection</h2>
              {nfts.length > 0 && (
                <Badge variant="secondary" className="text-xs">{nfts.length}</Badge>
              )}
            </div>

            {nftsLoading ? (
              <div className="grid grid-cols-3 gap-2 sm:gap-3 px-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : nfts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No NFTs to display yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3 px-4">
                {nfts.map(nft => (
                  <button
                    key={nft.tokenId}
                    onClick={() => setSelectedNft(nft)}
                    className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/50 hover:border-primary/50 transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {nft.image ? (
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* NFT Detail Modal */}
      {selectedNft && (
        <WalletNFTDetailModal
          nft={selectedNft}
          isOpen={!!selectedNft}
          onClose={() => setSelectedNft(null)}
        />
      )}
    </div>
  );
}
