import { useParams, useSearchParams } from 'react-router-dom';
import { LivepeerPlayer } from '@/components/LivepeerPlayer';
import { WebRTCViewer } from '@/components/streaming/WebRTCViewer';
import { LiveChat } from '@/components/LiveChat';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Radio, Users, Share2, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStreamPresence } from '@/hooks/useStreamPresence';

const Watch = () => {
  const { playbackId } = useParams<{ playbackId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Check if this is a WebRTC room (via query param or ID format)
  const isWebRTC = searchParams.get('type') === 'webrtc' || 
    (playbackId && playbackId.length === 36 && playbackId.includes('-')); // UUID format indicates room ID

  // Track viewer presence for real-time viewer count
  const { viewerCount, isConnected } = useStreamPresence(playbackId);

  useSEO({
    title: "Watch Live | The Lily Pad",
    description: "Watch live streams on The Lily Pad. Join the chat, support creators, and be part of the community."
  });

  const shareUrl = window.location.href;

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({
      title: 'Link copied!',
      description: 'Share this link to invite others to watch.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareStream = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Watch this live stream!',
          text: 'Join me watching this live stream on The Lily Pad',
          url: shareUrl,
        });
      } catch {
        copyShareLink();
      }
    } else {
      copyShareLink();
    }
  };

  if (!playbackId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-24 text-center">
          <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No stream specified</p>
          <Button variant="link" onClick={() => navigate('/streams')}>
            Browse Streams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-6 pt-24 max-w-7xl px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyShareLink}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={shareStream}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-3">
            {isWebRTC ? (
              <WebRTCViewer
                roomId={playbackId}
                className="w-full aspect-video rounded-xl overflow-hidden"
              />
            ) : (
              <LivepeerPlayer
                playbackId={playbackId}
                isLive={true}
                autoPlay={true}
                className="w-full rounded-xl overflow-hidden"
              />
            )}
            
            {/* Stream Info Below Player */}
            <div className="mt-4 p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-lg font-semibold">Live Stream</h1>
                    <Badge className="bg-red-500 text-white">
                      <Radio className="w-3 h-3 mr-1 animate-pulse" />
                      LIVE
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {isWebRTC ? 'Browser Stream' : 'HLS Stream'} • ID: {playbackId.slice(0, 12)}...
                  </p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">
                    {isConnected ? `${viewerCount} watching` : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Chat Sidebar */}
          <div className="lg:col-span-1 h-[calc(100vh-200px)] min-h-[400px]">
            <LiveChat 
              playbackId={playbackId} 
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;
