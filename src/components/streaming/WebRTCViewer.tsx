import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Volume2, VolumeX, Maximize2, Users, Radio } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface WebRTCViewerProps {
  roomId: string;
  className?: string;
}

export const WebRTCViewer: React.FC<WebRTCViewerProps> = ({ roomId, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const joinRoom = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Join the room as a viewer
      const { data, error: joinError } = await supabase.functions.invoke('webrtc-stream', {
        body: { action: 'join-as-viewer', roomId },
      });

      if (joinError || !data?.success) {
        throw new Error(data?.error || joinError?.message || 'Failed to join room');
      }

      console.log('Joined room as viewer:', data);
      setJoinUrl(data.user.joinUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to stream';
      console.error('WebRTC viewer error:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    joinRoom();
  }, [joinRoom]);

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (error) {
    return (
      <div className={cn('relative bg-black rounded-lg overflow-hidden flex items-center justify-center', className)}>
        <div className="text-center p-8">
          <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Unable to join stream</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <Button onClick={joinRoom} variant="secondary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('relative bg-black rounded-lg overflow-hidden flex items-center justify-center', className)}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn('relative bg-black rounded-lg overflow-hidden group', className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Livepeer Room Embed */}
      {joinUrl && (
        <iframe
          ref={iframeRef}
          src={joinUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          title="Live Stream"
        />
      )}

      {/* Live indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
          LIVE
        </span>
      </div>

      {/* Controls overlay */}
      <div 
        className={cn(
          'absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="cursor-pointer"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
