import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Disc3, Album, Star, TrendingUp, Search } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MusicNFTCard } from '@/components/music/MusicNFTCard';
import { MusicDetailModal } from '@/components/music/MusicDetailModal';
import { supabase } from '@/integrations/supabase/client';

interface MusicCollection {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  creator_address: string;
  total_supply: number;
  minted: number;
  phases: any[];
  collection_type: string;
  tracks: MusicTrack[];
}

interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
  duration?: number;
  genre?: string;
  bpm?: number;
}

type CategoryFilter = 'all' | 'singles' | 'one_of_one' | 'editions' | 'albums';
type CardCategory = 'singles' | 'one_of_one' | 'editions' | 'albums';

const categoryConfig: Record<CategoryFilter, { icon: React.ReactNode; label: string }> = {
  all: { icon: <Music className="h-4 w-4" />, label: 'All Music' },
  singles: { icon: <Disc3 className="h-4 w-4" />, label: 'Singles' },
  one_of_one: { icon: <Star className="h-4 w-4" />, label: '1 of 1\'s' },
  editions: { icon: <TrendingUp className="h-4 w-4" />, label: 'Editions' },
  albums: { icon: <Album className="h-4 w-4" />, label: 'Albums' },
};

export default function MusicStore() {
  const [collections, setCollections] = useState<MusicCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<MusicCollection | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchMusicCollections();
  }, []);

  const fetchMusicCollections = async () => {
    setIsLoading(true);
    try {
      // Fetch collections with music media type
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('media_type', 'audio')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (collectionsError) throw collectionsError;

      // Fetch audio metadata for all collections
      const collectionsWithTracks = await Promise.all(
        (collectionsData || []).map(async (collection) => {
          const { data: audioData } = await supabase
            .from('collection_audio_metadata')
            .select('*')
            .eq('collection_id', collection.id)
            .order('track_number');

          const tracks: MusicTrack[] = (audioData || []).map((audio: any) => ({
            id: audio.artwork_id,
            name: collection.name,
            artist: audio.artist || 'Unknown Artist',
            audioUrl: audio.audio_url,
            coverUrl: audio.cover_art_url || collection.image_url || '',
            duration: audio.duration_seconds,
            genre: audio.genre,
            bpm: audio.bpm,
          }));

          return {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            image_url: collection.image_url,
            creator_address: collection.creator_address,
            total_supply: collection.total_supply,
            minted: collection.minted,
            phases: Array.isArray(collection.phases) ? collection.phases : [],
            collection_type: collection.collection_type,
            tracks,
          } as MusicCollection;
        })
      );

      setCollections(collectionsWithTracks);
    } catch (error) {
      console.error('Error fetching music collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const categorizeCollection = (collection: MusicCollection): CardCategory => {
    const trackCount = collection.tracks.length;
    const supply = collection.total_supply;

    if (trackCount > 1) return 'albums';
    if (supply === 1) return 'one_of_one';
    if (supply <= 10) return 'editions';
    return 'singles';
  };

  const getFilteredCollections = (category: CategoryFilter) => {
    let filtered = collections;

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.tracks.some(t => t.artist.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter(c => categorizeCollection(c) === category);
    }

    return filtered;
  };

  const handleCollectionClick = (collection: MusicCollection) => {
    setSelectedCollection(collection);
    setIsDetailOpen(true);
  };

  const stats = {
    total: collections.length,
    singles: collections.filter(c => categorizeCollection(c) === 'singles').length,
    oneOfOne: collections.filter(c => categorizeCollection(c) === 'one_of_one').length,
    editions: collections.filter(c => categorizeCollection(c) === 'editions').length,
    albums: collections.filter(c => categorizeCollection(c) === 'albums').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Music className="h-5 w-5" />
            <span className="font-medium">Lily Music Store</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Discover & Collect Music NFTs
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Own exclusive tracks, limited editions, and one-of-a-kind audio collectibles from your favorite artists.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Tracks', value: stats.total, icon: Music },
            { label: 'Singles', value: stats.singles, icon: Disc3 },
            { label: '1 of 1\'s', value: stats.oneOfOne, icon: Star },
            { label: 'Editions', value: stats.editions, icon: TrendingUp },
            { label: 'Albums', value: stats.albums, icon: Album },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tracks, artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as CategoryFilter)}>
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-5 mb-8">
            {Object.entries(categoryConfig).map(([key, { icon, label }]) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(categoryConfig).map((category) => (
            <TabsContent key={category} value={category}>
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="aspect-square rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {getFilteredCollections(category as CategoryFilter).length === 0 ? (
                    <div className="text-center py-16">
                      <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">No music found</h3>
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? 'Try adjusting your search'
                          : 'Be the first to create a music NFT!'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {getFilteredCollections(category as CategoryFilter).map((collection, index) => {
                        const collectionCategory = categorizeCollection(collection);
                        return (
                        <motion.div
                          key={collection.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <MusicNFTCard
                            collection={collection}
                            tracks={collection.tracks}
                            category={collectionCategory}
                            onClick={() => handleCollectionClick(collection)}
                          />
                        </motion.div>
                      );})}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Detail Modal */}
      <MusicDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        collection={selectedCollection}
        tracks={selectedCollection?.tracks || []}
      />
    </div>
  );
}
