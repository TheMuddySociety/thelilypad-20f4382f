import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ArrowLeft, Layers } from "lucide-react";

interface CreatorCollection {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  status: string;
  total_supply: number;
  minted: number;
  created_at: string;
}

interface StreamerProfileData {
  display_name: string | null;
}

const StreamerCollections = () => {
  const { streamerId } = useParams<{ streamerId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CreatorCollection[]>([]);
  const [streamerName, setStreamerName] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!streamerId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Fetch streamer profile for name
      const { data: profileData } = await supabase
        .from('streamer_profiles')
        .select('display_name')
        .eq('user_id', streamerId)
        .maybeSingle();

      setStreamerName(profileData?.display_name || null);

      // Fetch all collections
      const { data: collectionsData } = await supabase
        .from('collections')
        .select('id, name, description, image_url, status, total_supply, minted, created_at')
        .eq('creator_id', streamerId)
        .order('created_at', { ascending: false });

      setCollections(collectionsData || []);
      setLoading(false);
    };

    fetchData();
  }, [streamerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-10 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/streamer/${streamerId}`)}
              className="gap-2 hover:bg-muted/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Layers className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">NFT Collections</h1>
              <p className="text-muted-foreground">
                {streamerName ? `By ${streamerName}` : 'All collections by this creator'}
              </p>
            </div>
          </motion.div>

          {/* Collections Grid */}
          {collections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection, index) => {
                const mintProgress = collection.total_supply > 0 
                  ? (collection.minted / collection.total_supply) * 100 
                  : 0;
                const statusConfig = {
                  live: { label: 'LIVE', bg: 'bg-green-500', text: 'text-white' },
                  upcoming: { label: 'UPCOMING', bg: 'bg-yellow-500', text: 'text-black' },
                  ended: { label: 'ENDED', bg: 'bg-muted', text: 'text-muted-foreground' },
                };
                const status = statusConfig[collection.status as keyof typeof statusConfig] || statusConfig.upcoming;
                
                return (
                  <motion.div
                    key={collection.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + index * 0.05 }}
                  >
                    <Link to={`/collection/${collection.id}`}>
                      <Card className="overflow-hidden border-border/50 hover:border-purple-500/50 transition-all duration-300 group cursor-pointer hover:shadow-lg hover:shadow-purple-500/10">
                        {/* Collection Image */}
                        <div className="relative aspect-[16/9] overflow-hidden bg-muted/50">
                          {collection.image_url ? (
                            <img 
                              src={collection.image_url} 
                              alt={collection.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-primary/10">
                              <Layers className="h-12 w-12 text-purple-500/50" />
                            </div>
                          )}
                          
                          {/* Status Badge */}
                          <div className="absolute top-2 right-2">
                            <Badge className={`${status.bg} ${status.text} text-xs font-semibold px-2 py-0.5`}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Collection Info */}
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-base mb-1 line-clamp-1 group-hover:text-purple-500 transition-colors">
                            {collection.name}
                          </h3>
                          {collection.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {collection.description}
                            </p>
                          )}
                          
                          {/* Mint Progress */}
                          <div className="space-y-2">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-primary rounded-full transition-all duration-500"
                                style={{ width: `${mintProgress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{collection.minted} / {collection.total_supply} minted</span>
                              <span>{mintProgress.toFixed(0)}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <div className="p-4 rounded-full bg-purple-500/10 w-fit mx-auto mb-4">
                <Layers className="h-12 w-12 text-purple-500/50" />
              </div>
              <p className="font-medium text-lg mb-1">No collections yet</p>
              <p className="text-sm">This creator hasn't launched any NFT collections.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StreamerCollections;
