import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider, useWallet } from "@/providers/WalletProvider";
import { AuthProvider } from "@/providers/AuthProvider";

import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatusIndicator from "@/components/NetworkStatusIndicator";
import { AudioPlayerProvider } from "./providers/AudioPlayerProvider";
import { MiniPlayer } from "./components/music/MiniPlayer";
import { MobileBottomNav } from "./components/MobileBottomNav";
import FrogLoader from "./components/FrogLoader";
import ProtectedRoute from "./components/ProtectedRoute";
import { PWAUpdateNotification } from "./components/PWAUpdateNotification";
import { setupGlobalErrorHandlers } from "./lib/errorLogging";

// Lazy load ALL pages to reduce initial bundle and improve FID
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Auth guard for auth page - redirects to home if already connected
const AuthPageGuard = () => {
  const { isConnected, isConnecting } = useWallet();

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FrogLoader size="lg" />
      </div>
    );
  }

  if (isConnected) {
    return <Navigate to="/" replace />;
  }

  return <Auth />;
};

// Lazy load non-critical pages for better initial bundle size
const WalletProfile = lazy(() => import("./pages/WalletProfile"));
const Streams = lazy(() => import("./pages/Streams"));
const Streamers = lazy(() => import("./pages/Streamers"));
const GoLive = lazy(() => import("./pages/GoLive"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DonorProfile = lazy(() => import("./pages/DonorProfile"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

// Profile pages
const ProfileSuspended = lazy(() => import("./pages/ProfileSuspended"));
const StreamerProfile = lazy(() => import("./pages/StreamerProfile"));
const StreamerCollections = lazy(() => import("./pages/StreamerCollections"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
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
const ProfileTypeSelection = lazy(() => import("./pages/ProfileTypeSelection"));
const LimitedEditionMint = lazy(() => import("./pages/LimitedEditionMint"));

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

// Set up global error handlers once
setupGlobalErrorHandlers();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <AuthProvider>
          <AudioPlayerProvider>
            <TooltipProvider>

              <NetworkStatusIndicator />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/auth" element={<AuthPageGuard />} />
                    <Route path="/auth/callback" element={<Suspense fallback={<PageLoader />}><AuthCallback /></Suspense>} />
                    <Route path="/profile-setup" element={<Suspense fallback={<PageLoader />}><ProfileTypeSelection /></Suspense>} />
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/wallet" element={<ProtectedRoute><WalletProfile /></ProtectedRoute>} />
                    <Route path="/streams" element={<ProtectedRoute><Streams /></ProtectedRoute>} />
                    <Route path="/streamers" element={<ProtectedRoute><Streamers /></ProtectedRoute>} />
                    <Route path="/go-live" element={<ProtectedRoute><GoLive /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/donor-profile" element={<ProtectedRoute><DonorProfile /></ProtectedRoute>} />
                    <Route path="/streamer/:streamerId" element={<ProtectedRoute><StreamerProfile /></ProtectedRoute>} />
                    <Route path="/streamer/:streamerId/collections" element={<ProtectedRoute><StreamerCollections /></ProtectedRoute>} />
                    <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                    <Route path="/following" element={<ProtectedRoute><Following /></ProtectedRoute>} />
                    <Route path="/clip/:clipId" element={<ProtectedRoute><ClipViewer /></ProtectedRoute>} />
                    <Route path="/moderation" element={<ProtectedRoute><Moderation /></ProtectedRoute>} />
                    <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
                    <Route path="/marketplace/sticker/:packId" element={<ProtectedRoute><StickerPackDetail /></ProtectedRoute>} />
                    <Route path="/my-sticker-packs" element={<ProtectedRoute><CreatorStickerPacks /></ProtectedRoute>} />
                    <Route path="/channel-emotes" element={<ProtectedRoute><ChannelEmotes /></ProtectedRoute>} />
                    <Route path="/launchpad" element={<ProtectedRoute><Launchpad /></ProtectedRoute>} />
                    <Route path="/launchpad/:collectionId" element={<ProtectedRoute><CollectionDetail /></ProtectedRoute>} />
                    <Route path="/collection/:collectionId" element={<ProtectedRoute><CollectionDetail /></ProtectedRoute>} />
                    <Route path="/my-nfts" element={<ProtectedRoute><MyNFTs /></ProtectedRoute>} />
                    <Route path="/watch/:playbackId" element={<ProtectedRoute><Watch /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/fees" element={<ProtectedRoute><FeesAndPricing /></ProtectedRoute>} />
                    <Route path="/buyback-program" element={<ProtectedRoute><BuybackProgram /></ProtectedRoute>} />
                    <Route path="/official-packs" element={<ProtectedRoute><OfficialPacks /></ProtectedRoute>} />
                    <Route path="/my-purchases" element={<ProtectedRoute><MyPurchases /></ProtectedRoute>} />
                    <Route path="/music-store" element={<ProtectedRoute><MusicStore /></ProtectedRoute>} />
                    <Route path="/artist/:artistAddress" element={<ProtectedRoute><ArtistProfile /></ProtectedRoute>} />
                    <Route path="/raffles" element={<ProtectedRoute><Raffles /></ProtectedRoute>} />
                    <Route path="/blind-boxes" element={<ProtectedRoute><BlindBoxes /></ProtectedRoute>} />
                    <Route path="/governance" element={<ProtectedRoute><Governance /></ProtectedRoute>} />
                    <Route path="/limited-edition" element={<ProtectedRoute><LimitedEditionMint /></ProtectedRoute>} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <MobileBottomNav />
                <MiniPlayer />
                <PWAUpdateNotification />
              </BrowserRouter>
            </TooltipProvider>
          </AudioPlayerProvider>
      </WalletProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
