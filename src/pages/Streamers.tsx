import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Filter, Users, CheckCircle, Calendar, ExternalLink, Heart, ArrowUpDown, Radio, Tag } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { FollowButton } from "@/components/FollowButton";

type StreamerProfile = Tables<"streamer_profiles">;
type StreamerWithFollowers = StreamerProfile & { follower_count: number; is_live: boolean };

const Streamers = () => {
  const [streamers, setStreamers] = useState<StreamerWithFollowers[]>([]);
  const [filteredStreamers, setFilteredStreamers] = useState<StreamerWithFollowers[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [loading, setLoading] = useState(true);

const availableCategories = [
  'Gaming', 'Just Chatting', 'Music', 'Art', 'Cooking', 
  'Sports', 'Education', 'Technology', 'Fitness', 'Travel',
  'Comedy', 'News', 'Crypto', 'DeFi', 'NFTs'
];

  useEffect(() => {
    fetchStreamers();
  }, []);

  useEffect(() => {
    filterAndSortStreamers();
  }, [streamers, searchQuery, verifiedFilter, categoryFilter, sortBy]);

  const fetchStreamers = async () => {
    try {
      // Fetch streamer profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("streamer_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch follower counts for each streamer
      const { data: followerCounts, error: followersError } = await supabase
        .from("followers")
        .select("streamer_id");

      if (followersError) throw followersError;

      // Fetch live streams
      const { data: liveStreams, error: liveError } = await supabase
        .from("streams")
        .select("user_id")
        .eq("is_live", true);

      if (liveError) throw liveError;

      // Count followers per streamer
      const countMap = new Map<string, number>();
      followerCounts?.forEach((f) => {
        countMap.set(f.streamer_id, (countMap.get(f.streamer_id) || 0) + 1);
      });

      // Track live streamers
      const liveStreamersSet = new Set(liveStreams?.map((s) => s.user_id) || []);

      // Merge profiles with follower counts and live status
      const streamersWithCounts: StreamerWithFollowers[] = (profiles || []).map((profile) => ({
        ...profile,
        follower_count: countMap.get(profile.user_id) || 0,
        is_live: liveStreamersSet.has(profile.user_id),
      }));

      setStreamers(streamersWithCounts);
    } catch (error) {
      console.error("Error fetching streamers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortStreamers = () => {
    let filtered = [...streamers];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (streamer) =>
          streamer.display_name?.toLowerCase().includes(query) ||
          streamer.bio?.toLowerCase().includes(query)
      );
    }

    // Verified filter
    if (verifiedFilter === "verified") {
      filtered = filtered.filter((streamer) => streamer.is_verified);
    } else if (verifiedFilter === "unverified") {
      filtered = filtered.filter((streamer) => !streamer.is_verified);
    } else if (verifiedFilter === "live") {
      filtered = filtered.filter((streamer) => streamer.is_live);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((streamer) => 
        Array.isArray(streamer.categories) && streamer.categories.includes(categoryFilter)
      );
    }

    // Sort
    if (sortBy === "popular") {
      filtered.sort((a, b) => b.follower_count - a.follower_count);
    } else if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "name") {
      filtered.sort((a, b) => (a.display_name || "").localeCompare(b.display_name || ""));
    }

    setFilteredStreamers(filtered);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSocialCount = (streamer: StreamerProfile) => {
    let count = 0;
    if (streamer.social_twitter) count++;
    if (streamer.social_youtube) count++;
    if (streamer.social_discord) count++;
    if (streamer.social_instagram) count++;
    if (streamer.social_tiktok) count++;
    return count;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Streamer Directory
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover talented creators, explore their profiles, and find your next favorite streamer
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <div className="flex gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-card border-border">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
              <SelectTrigger className="w-[180px] bg-card border-border">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streamers</SelectItem>
                <SelectItem value="live">Live Only</SelectItem>
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-card border-border">
                <Tag className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 mb-6 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {filteredStreamers.length} streamer{filteredStreamers.length !== 1 ? "s" : ""} found
          </span>
        </div>

        {/* Streamers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl p-6 animate-pulse border border-border"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-5 bg-muted rounded w-32 mb-2" />
                    <div className="h-4 bg-muted rounded w-20" />
                  </div>
                </div>
                <div className="h-16 bg-muted rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-8 bg-muted rounded w-20" />
                  <div className="h-8 bg-muted rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredStreamers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No streamers found</h3>
            <p className="text-muted-foreground">
              {searchQuery || verifiedFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Be the first to create a profile!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStreamers.map((streamer, index) => (
              <motion.div
                key={streamer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/streamer/${streamer.user_id}`}>
                  <div className="group bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        <Avatar className={`h-16 w-16 ring-2 ${streamer.is_live ? 'ring-red-500' : 'ring-border'} group-hover:ring-primary/50 transition-all`}>
                          <AvatarImage src={streamer.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-lg">
                            {getInitials(streamer.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        {streamer.is_live && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase animate-pulse">
                            Live
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg truncate">
                            {streamer.display_name || "Anonymous"}
                          </h3>
                          {streamer.is_verified && (
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(streamer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <FollowButton streamerId={streamer.user_id} variant="compact" />
                    </div>

                    {/* Bio */}
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4 min-h-[3.75rem]">
                      {streamer.bio || "No bio yet"}
                    </p>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-2">
                      {streamer.is_live && (
                        <Badge variant="destructive" className="bg-red-500 animate-pulse">
                          <Radio className="h-3 w-3 mr-1" />
                          Live Now
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        <Heart className="h-3 w-3 mr-1" />
                        {streamer.follower_count} Follower{streamer.follower_count !== 1 ? "s" : ""}
                      </Badge>
                      {streamer.is_verified && (
                        <Badge variant="default" className="bg-primary/20 text-primary border-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {getSocialCount(streamer) > 0 && (
                        <Badge variant="secondary">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {getSocialCount(streamer)} Social Link{getSocialCount(streamer) !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {streamer.schedule && Array.isArray(streamer.schedule) && streamer.schedule.length > 0 && (
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          Has Schedule
                        </Badge>
                      )}
                      {Array.isArray(streamer.categories) && streamer.categories.slice(0, 2).map((category) => (
                        <Badge key={category} variant="outline" className="bg-accent/10 border-accent/30 text-accent">
                          <Tag className="h-3 w-3 mr-1" />
                          {category}
                        </Badge>
                      ))}
                      {Array.isArray(streamer.categories) && streamer.categories.length > 2 && (
                        <Badge variant="outline" className="text-muted-foreground">
                          +{streamer.categories.length - 2} more
                        </Badge>
                      )}
                    </div>

                    {/* View Profile Button */}
                    <Button
                      variant="ghost"
                      className="w-full mt-4 group-hover:bg-primary/10 group-hover:text-primary"
                    >
                      View Profile
                    </Button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Streamers;
