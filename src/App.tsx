import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/providers/WalletProvider";
import { TestnetBanner } from "@/components/TestnetBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatusIndicator from "@/components/NetworkStatusIndicator";
import Index from "./pages/Index";
import WalletProfile from "./pages/WalletProfile";
import Streams from "./pages/Streams";
import Streamers from "./pages/Streamers";
import Auth from "./pages/Auth";
import GoLive from "./pages/GoLive";
import Dashboard from "./pages/Dashboard";
import DonorProfile from "./pages/DonorProfile";
import StreamerProfile from "./pages/StreamerProfile";
import StreamerCollections from "./pages/StreamerCollections";
import EditStreamerProfile from "./pages/EditStreamerProfile";
import Following from "./pages/Following";
import ClipViewer from "./pages/ClipViewer";
import Moderation from "./pages/Moderation";
import Launchpad from "./pages/Launchpad";
import Marketplace from "./pages/Marketplace";
import StickerPackDetail from "./pages/StickerPackDetail";
import CreatorStickerPacks from "./pages/CreatorStickerPacks";
import ChannelEmotes from "./pages/ChannelEmotes";
import CollectionDetail from "./pages/CollectionDetail";
import Watch from "./pages/Watch";
import MyNFTs from "./pages/MyNFTs";
import AdminDashboard from "./pages/AdminDashboard";
import FeesAndPricing from "./pages/FeesAndPricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <TestnetBanner />
          <NetworkStatusIndicator />
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              <Route path="/my-nfts" element={<MyNFTs />} />
              <Route path="/watch/:playbackId" element={<Watch />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/fees" element={<FeesAndPricing />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
