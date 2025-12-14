import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TipButton } from "@/components/TipButton";
import { 
  Play, 
  Users, 
  Heart, 
  MessageCircle, 
  Gift, 
  Radio, 
  Search,
  Filter,
  Zap,
  Crown
} from "lucide-react";
import { motion } from "framer-motion";

// Mock data for live streams
const liveStreams = [
  {
    id: "1",
    title: "Minting My Genesis Collection LIVE",
    creator: "CryptoArtist",
    creatorId: "user-1",
    creatorAddress: "0x1234567890abcdef1234567890abcdef12345678",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=artist1",
    thumbnail: "https://images.unsplash.com/photo-1634017839464-5c339afa1c9d?w=800&q=80",
    viewers: 1247,
    likes: 892,
    isLive: true,
    category: "Minting",
    donations: 45.2,
  },
  {
    id: "2",
    title: "Creating Pixel Art NFTs - Tutorial",
    creator: "PixelMaster",
    creatorId: "user-2",
    creatorAddress: "0x2345678901abcdef2345678901abcdef23456789",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=pixel",
    thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
    viewers: 856,
    likes: 654,
    isLive: true,
    category: "Tutorial",
    donations: 23.8,
  },
  {
    id: "3",
    title: "Dutch Auction - Rare Collectibles",
    creator: "AuctionHouse",
    creatorId: "user-3",
    creatorAddress: "0x3456789012abcdef3456789012abcdef34567890",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=auction",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    viewers: 2341,
    likes: 1203,
    isLive: true,
    category: "Auction",
    donations: 128.5,
  },
  {
    id: "4",
    title: "Q&A with Top Monad Collectors",
    creator: "MonadWhale",
    creatorId: "user-4",
    creatorAddress: "0x4567890123abcdef4567890123abcdef45678901",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=whale",
    thumbnail: "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&q=80",
    viewers: 534,
    likes: 421,
    isLive: true,
    category: "Community",
    donations: 67.3,
  },
];

const upcomingStreams = [
  {
    id: 5,
    title: "Exclusive Drop Reveal",
    creator: "LegendaryCreator",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=legend",
    thumbnail: "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&q=80",
    scheduledTime: "Today, 8:00 PM",
    category: "Drop",
  },
  {
    id: 6,
    title: "NFT Trading Strategies",
    creator: "TraderPro",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=trader",
    thumbnail: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=800&q=80",
    scheduledTime: "Tomorrow, 3:00 PM",
    category: "Education",
  },
];

const categories = ["All", "Minting", "Auction", "Tutorial", "Community", "Drop"];

const Streams: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [featuredStream] = useState(liveStreams[2]); // Dutch Auction as featured

  const filteredStreams = selectedCategory === "All" 
    ? liveStreams 
    : liveStreams.filter(s => s.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero / Featured Stream */}
      <section className="pt-24 pb-8 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Featured Stream */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-2xl overflow-hidden group cursor-pointer"
              >
                <div className="aspect-video relative">
                  <img 
                    src={featuredStream.thumbnail} 
                    alt={featuredStream.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Live Badge */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <Badge className="bg-red-500 text-white animate-pulse flex items-center gap-1">
                      <Radio className="w-3 h-3" />
                      LIVE
                    </Badge>
                    <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm">
                      <Users className="w-3 h-3 mr-1" />
                      {featuredStream.viewers.toLocaleString()}
                    </Badge>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-20 h-20 bg-primary/90 rounded-full flex items-center justify-center shadow-glow">
                      <Play className="w-8 h-8 text-primary-foreground ml-1" />
                    </div>
                  </div>

                  {/* Stream Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <img 
                        src={featuredStream.avatar} 
                        alt={featuredStream.creator}
                        className="w-10 h-10 rounded-full border-2 border-primary"
                      />
                      <div>
                        <p className="text-white font-semibold">{featuredStream.creator}</p>
                        <p className="text-white/70 text-sm">{featuredStream.category}</p>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">{featuredStream.title}</h2>
                                    <div className="flex items-center gap-4">
                                      <Button className="bg-primary hover:bg-primary/90 shadow-glow">
                                        <Play className="w-4 h-4 mr-2" />
                                        Watch Now
                                      </Button>
                                      <TipButton
                                        streamerAddress={featuredStream.creatorAddress}
                                        streamerName={featuredStream.creator}
                                        streamerId={featuredStream.creatorId}
                                        streamId={featuredStream.id}
                                        variant="outline"
                                        className="border-white/30 text-white hover:bg-white/10"
                                      />
                                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Sidebar - Stream Info & Chat Preview */}
            <div className="space-y-4">
              {/* Stream Stats */}
              <div className="bg-card rounded-xl p-5 border border-border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Live Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{featuredStream.viewers.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Viewers</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-accent">{featuredStream.likes.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg col-span-2">
                    <p className="text-2xl font-bold text-frog-gold">{featuredStream.donations} MON</p>
                    <p className="text-xs text-muted-foreground">Total Donations</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-card rounded-xl p-5 border border-border">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="justify-start">
                    <Heart className="w-4 h-4 mr-2 text-red-500" />
                    Follow Creator
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Join Chat
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Crown className="w-4 h-4 mr-2 text-frog-gold" />
                    Subscribe
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter & Search */}
      <section className="px-6 pb-6">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder="Search streams..."
                  className="pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Live Streams Grid */}
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            Live Now
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {filteredStreams.map((stream, index) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="relative rounded-xl overflow-hidden mb-3">
                  <div className="aspect-video">
                    <img 
                      src={stream.thumbnail} 
                      alt={stream.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Live Badge */}
                  <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">
                    <Radio className="w-2.5 h-2.5 mr-1" />
                    LIVE
                  </Badge>
                  
                  {/* Viewer Count */}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    <Users className="w-3 h-3 text-white" />
                    <span className="text-xs text-white">{stream.viewers.toLocaleString()}</span>
                  </div>

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-primary/90 rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <img 
                    src={stream.avatar} 
                    alt={stream.creator}
                    className="w-9 h-9 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {stream.title}
                    </h4>
                    <p className="text-muted-foreground text-xs mt-1">{stream.creator}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {stream.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Upcoming Streams */}
          <h3 className="text-xl font-bold mb-4">Upcoming Streams</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingStreams.map((stream, index) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl border border-border overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors"
              >
                <div className="relative aspect-video">
                  <img 
                    src={stream.thumbnail} 
                    alt={stream.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Badge className="bg-accent text-accent-foreground">
                      {stream.scheduledTime}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={stream.avatar} 
                      alt={stream.creator}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <h4 className="font-medium text-sm">{stream.title}</h4>
                      <p className="text-muted-foreground text-xs">{stream.creator}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Set Reminder
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Streams;
