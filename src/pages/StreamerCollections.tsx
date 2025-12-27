import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import { ArrowLeft, Layers, Filter, ArrowUpDown, Search, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const ITEMS_PER_PAGE = 12;
type ViewMode = 'grid' | 'list';

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

type StatusFilter = 'all' | 'live' | 'upcoming' | 'ended';
type SortOption = 'newest' | 'oldest' | 'progress-high' | 'progress-low' | 'name-asc' | 'name-desc';

const StreamerCollections = () => {
  const { streamerId } = useParams<{ streamerId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CreatorCollection[]>([]);
  const [streamerName, setStreamerName] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useSEO({
    title: streamerName ? `${streamerName}'s Collections | The Lily Pad` : "NFT Collections | The Lily Pad",
    description: "Browse all NFT collections by this creator. Filter by status, sort, and explore minting opportunities."
  });

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

  const filteredAndSortedCollections = useMemo(() => {
    let result = [...collections];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.description?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'progress-high': {
          const progressA = a.total_supply > 0 ? (a.minted / a.total_supply) : 0;
          const progressB = b.total_supply > 0 ? (b.minted / b.total_supply) : 0;
          return progressB - progressA;
        }
        case 'progress-low': {
          const progressA = a.total_supply > 0 ? (a.minted / a.total_supply) : 0;
          const progressB = b.total_supply > 0 ? (b.minted / b.total_supply) : 0;
          return progressA - progressB;
        }
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [collections, statusFilter, sortBy, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy, searchQuery]);

  const totalPages = Math.ceil(filteredAndSortedCollections.length / ITEMS_PER_PAGE);
  const paginatedCollections = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedCollections.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedCollections, currentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

          {/* Filters and Sorting */}
          {collections.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
            >
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search collections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[200px] h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="progress-high">Most Minted</SelectItem>
                      <SelectItem value="progress-low">Least Minted</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Showing {paginatedCollections.length} of {filteredAndSortedCollections.length} collections
                  {filteredAndSortedCollections.length !== collections.length && ` (${collections.length} total)`}
                </p>
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
                  <ToggleGroupItem value="grid" aria-label="Grid view" className="h-9 w-9 p-0">
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List view" className="h-9 w-9 p-0">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </motion.div>
          )}

          {/* Collections Grid/List */}
          {paginatedCollections.length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedCollections.map((collection, index) => {
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
                              <div className="absolute top-2 right-2">
                                <Badge className={`${status.bg} ${status.text} text-xs font-semibold px-2 py-0.5`}>
                                  {status.label}
                                </Badge>
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-base mb-1 line-clamp-1 group-hover:text-purple-500 transition-colors">
                                {collection.name}
                              </h3>
                              {collection.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                  {collection.description}
                                </p>
                              )}
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
                <div className="flex flex-col gap-4">
                  {paginatedCollections.map((collection, index) => {
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
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.03 }}
                      >
                        <Link to={`/collection/${collection.id}`}>
                          <Card className="overflow-hidden border-border/50 hover:border-purple-500/50 transition-all duration-300 group cursor-pointer hover:shadow-lg hover:shadow-purple-500/10">
                            <div className="flex flex-col sm:flex-row">
                              <div className="relative w-full sm:w-48 h-32 sm:h-auto overflow-hidden bg-muted/50 flex-shrink-0">
                                {collection.image_url ? (
                                  <img 
                                    src={collection.image_url} 
                                    alt={collection.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-primary/10">
                                    <Layers className="h-10 w-10 text-purple-500/50" />
                                  </div>
                                )}
                              </div>
                              <CardContent className="flex-1 p-4 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-semibold text-base group-hover:text-purple-500 transition-colors">
                                      {collection.name}
                                    </h3>
                                    <Badge className={`${status.bg} ${status.text} text-xs font-semibold px-2 py-0.5 flex-shrink-0`}>
                                      {status.label}
                                    </Badge>
                                  </div>
                                  {collection.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                      {collection.description}
                                    </p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="h-2 bg-muted rounded-full overflow-hidden max-w-md">
                                    <div 
                                      className="h-full bg-gradient-to-r from-purple-500 to-primary rounded-full transition-all duration-500"
                                      style={{ width: `${mintProgress}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground max-w-md">
                                    <span>{collection.minted} / {collection.total_supply} minted</span>
                                    <span>{mintProgress.toFixed(0)}%</span>
                                  </div>
                                </div>
                              </CardContent>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2 pt-8"
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first, last, current, and adjacent pages
                      const showPage = page === 1 || 
                        page === totalPages || 
                        Math.abs(page - currentPage) <= 1;
                      const showEllipsis = page === 2 && currentPage > 3 || 
                        page === totalPages - 1 && currentPage < totalPages - 2;
                      
                      if (!showPage && !showEllipsis) return null;
                      
                      if (showEllipsis && !showPage) {
                        return (
                          <span key={page} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                      
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="icon"
                          onClick={() => goToPage(page)}
                          className="h-9 w-9"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-9 w-9"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </>
          ) : collections.length > 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="p-4 rounded-full bg-purple-500/10 w-fit mx-auto mb-4">
                <Filter className="h-12 w-12 text-purple-500/50" />
              </div>
              <p className="font-medium text-lg mb-1">No matching collections</p>
              <p className="text-sm mb-4">Try adjusting your filters to see more results.</p>
              <Button variant="outline" onClick={() => { setStatusFilter('all'); setSortBy('newest'); setSearchQuery(''); }}>
                Clear Filters
              </Button>
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
