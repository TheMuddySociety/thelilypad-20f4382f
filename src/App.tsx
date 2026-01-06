import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/providers/WalletProvider";
import { TestnetBanner } from "@/components/TestnetBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatusIndicator from "@/components/NetworkStatusIndicator";
import { AudioPlayerProvider } from "./providers/AudioPlayerProvider";
import { MiniPlayer } from "./components/music/MiniPlayer";
import FrogLoader from "./components/FrogLoader";

// Eagerly load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load non-critical pages for better initial bundle size
const WalletProfile = lazy(() => import("./pages/WalletProfile"));
const Streams = lazy(() => import("./pages/Streams"));
const Streamers = lazy(() => import("./pages/Streamers"));
const GoLive = lazy(() => import("./pages/GoLive"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DonorProfile = lazy(() => import("./pages/DonorProfile"));
const StreamerProfile = lazy(() => import("./pages/StreamerProfile"));
const StreamerCollections = lazy(() => import("./pages/StreamerCollections"));
const EditStreamerProfile = lazy(() => import("./pages/EditStreamerProfile"));
const Following = lazy(() => import("./pages/Following"));
const ClipViewer = lazy(() => import("./pages/ClipViewer"));
const Moderation = lazy(() => import("./pages/Moderation"));
const Launchpad = lazy(() => import("./pages/Launchpad"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const StickerPackDetail = lazy(() => import("./pages/StickerPackDetail"));
const CreatorStickerPacks = lazy(() => import("./pages/CreatorStickerPacks"));
const ChannelEmotes = lazy(() => import("./pages/ChannelEmotes"));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"));
const Watch = lazy(() => import("./pages/Watch"));
const MyNFTs = lazy(() => import("./pages/MyNFTs"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const FeesAndPricing = lazy(() => import("./pages/FeesAndPricing"));
const BuybackProgram = lazy(() => import("./pages/BuybackProgram"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const OfficialPacks = lazy(() => import("./pages/OfficialPacks"));
const MyPurchases = lazy(() => import("./pages/MyPurchases"));
const MusicStore = lazy(() => import("./pages/MusicStore"));
const ArtistProfile = lazy(() => import("./pages/ArtistProfile"));
const Raffles = lazy(() => import("./pages/Raffles"));
const BlindBoxes = lazy(() => import("./pages/BlindBoxes"));
const Governance = lazy(() => import("./pages/Governance"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <FrogLoader size="lg" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      gcTime: 300000, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <AudioPlayerProvider>
          <TooltipProvider>
            <TestnetBanner />
            <NetworkStatusIndicator />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/wallet" element={<WalletProfile />} />
                  <Route path="/streams" element={<Streams />} />
                  <Route path="/streamers" element={<Streamers />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/go-live" element={<GoLive />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/donor-profile" element={<DonorProfile />} />
                  <Route path="/streamer/:streamerId" element={<StreamerProfile />} />
                  <Route path="/streamer/:streamerId/collections" element={<StreamerCollections />} />
                  <Route path="/edit-profile" element={<EditStreamerProfile />} />
                  <Route path="/following" element={<Following />} />
                  <Route path="/clip/:clipId" element={<ClipViewer />} />
                  <Route path="/moderation" element={<Moderation />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/marketplace/sticker/:packId" element={<StickerPackDetail />} />
                  <Route path="/my-sticker-packs" element={<CreatorStickerPacks />} />
                  <Route path="/channel-emotes" element={<ChannelEmotes />} />
                  <Route path="/launchpad" element={<Launchpad />} />
                  <Route path="/launchpad/:collectionId" element={<CollectionDetail />} />
                  <Route path="/collection/:collectionId" element={<CollectionDetail />} />
                  <Route path="/my-nfts" element={<MyNFTs />} />
                  <Route path="/watch/:playbackId" element={<Watch />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/fees" element={<FeesAndPricing />} />
                  <Route path="/buyback-program" element={<BuybackProgram />} />
                  <Route path="/official-packs" element={<OfficialPacks />} />
                  <Route path="/my-purchases" element={<MyPurchases />} />
                  <Route path="/music-store" element={<MusicStore />} />
                  <Route path="/artist/:artistAddress" element={<ArtistProfile />} />
                  <Route path="/raffles" element={<Raffles />} />
                  <Route path="/blind-boxes" element={<BlindBoxes />} />
                  <Route path="/governance" element={<Governance />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <MiniPlayer />
            </BrowserRouter>
          </TooltipProvider>
        </AudioPlayerProvider>
      </WalletProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
