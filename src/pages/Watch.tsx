import { useParams } from 'react-router-dom';
import { LivepeerPlayer } from '@/components/LivepeerPlayer';
import { LiveChat } from '@/components/LiveChat';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Watch = () => {
  const { playbackId } = useParams<{ playbackId: string }>();
  const navigate = useNavigate();

  if (!playbackId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-24 text-center">
          <p className="text-muted-foreground">No stream specified</p>
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
        <Button
          variant="ghost"
          className="mb-4 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <LivepeerPlayer
              playbackId={playbackId}
              isLive={true}
              autoPlay={true}
              className="w-full rounded-xl overflow-hidden"
            />
            
            {/* Stream Info Below Player */}
            <div className="mt-4 p-4 bg-card rounded-xl border border-border">
              <h1 className="text-lg font-semibold">Live Stream</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Stream ID: {playbackId.slice(0, 12)}...
              </p>
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
