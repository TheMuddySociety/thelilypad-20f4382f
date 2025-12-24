import { useParams } from 'react-router-dom';
import { LivepeerPlayer } from '@/components/LivepeerPlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Watch = () => {
  const { playbackId } = useParams<{ playbackId: string }>();
  const navigate = useNavigate();

  if (!playbackId) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-muted-foreground">No stream specified</p>
        <Button variant="link" onClick={() => navigate('/streams')}>
          Browse Streams
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <Button
        variant="ghost"
        className="mb-4 gap-2"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LivepeerPlayer
            playbackId={playbackId}
            isLive={true}
            autoPlay={true}
            className="w-full"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stream Info</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Watching stream: {playbackId.slice(0, 8)}...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Watch;
