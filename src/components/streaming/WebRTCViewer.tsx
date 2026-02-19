import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Volume2, VolumeX, Maximize2, Radio } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface WebRTCViewerProps {
  /** A live MediaStream from the broadcaster, passed in-process (e.g. via context or ref). */
  stream?: MediaStream | null;
  className?: string;
}

/**
 * Browser-native stream viewer.
 * Renders the provided MediaStream directly in a <video> element — no Livepeer dependency.
 * When a stream URL is known (e.g. from an HLS/WHEP endpoint) it can also be set via
 * the `stream` prop once that signaling layer is implemented.
 */
export const WebRTCViewer: React.FC<WebRTCViewerProps> = ({ stream, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);

  // Attach the MediaStream to the <video> element whenever it changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream) {
      video.srcObject = stream;
      video.play().catch(err => console.warn('Autoplay prevented:', err));
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  // Sync muted/volume state to the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    video.volume = isMuted ? 0 : volume / 100;
  }, [isMuted, volume]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => setIsMuted(prev => !prev);

  if (!stream) {
    return (
      <div className={cn('relative bg-black rounded-lg overflow-hidden flex items-center justify-center', className)}>
        <div className="text-center p-8">
          <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-white font-medium mb-2">No stream available</p>
          <p className="text-muted-foreground text-sm">Waiting for the broadcaster to go live…</p>
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
      {/* Native video element — receives MediaStream directly */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="w-full h-full object-contain"
        aria-label="Live stream"
      />

      {/* Live indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">LIVE</span>
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
