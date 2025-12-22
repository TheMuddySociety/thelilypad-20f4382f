import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/providers/WalletProvider";
import Index from "./pages/Index";
import WalletProfile from "./pages/WalletProfile";
import Streams from "./pages/Streams";
import Streamers from "./pages/Streamers";
import Auth from "./pages/Auth";
import GoLive from "./pages/GoLive";
import Dashboard from "./pages/Dashboard";
import DonorProfile from "./pages/DonorProfile";
import StreamerProfile from "./pages/StreamerProfile";
import EditStreamerProfile from "./pages/EditStreamerProfile";
import Following from "./pages/Following";
import ClipViewer from "./pages/ClipViewer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletProvider>
      <TooltipProvider>
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
            <Route path="/edit-profile" element={<EditStreamerProfile />} />
            <Route path="/following" element={<Following />} />
            <Route path="/clip/:clipId" element={<ClipViewer />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WalletProvider>
  </QueryClientProvider>
);

export default App;
