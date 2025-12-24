import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, Radio } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import Hls from 'hls.js';

interface LivepeerPlayerProps {
  playbackId: string;
  title?: string;
  isLive?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
}

export const LivepeerPlayer = ({
  playbackId,
  title,
  isLive = false,
  autoPlay = true,
  muted = false,
  className = '',
}: LivepeerPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  const playbackUrl = `https://livepeercdn.studio/hls/${playbackId}/index.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    const initPlayer = () => {
      setIsLoading(true);
      setError(null);

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari has native HLS support
        video.src = playbackUrl;
      } else if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: isLive,
          backBufferLength: isLive ? 0 : 90,
        });
        
        hls.loadSource(playbackUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (autoPlay) {
            video.play().catch(() => {
              // Autoplay might be blocked
              setIsPlaying(false);
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError('Stream not available. It may be offline.');
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                setError('Failed to load stream');
                break;
            }
          }
        });
      } else {
        setError('HLS is not supported in this browser');
      }
    };

    initPlayer();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [playbackId, playbackUrl, autoPlay, isLive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    video.volume = volume;
  }, [isMuted, volume]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const handleVideoEvents = () => {
    const video = videoRef.current;
    if (!video) return;

    video.onplaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    video.onpause = () => setIsPlaying(false);
    video.onwaiting = () => setIsLoading(true);
    video.oncanplay = () => setIsLoading(false);
  };

  useEffect(() => {
    handleVideoEvents();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black rounded-lg overflow-hidden ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full aspect-video"
        playsInline
        muted={isMuted}
      />

      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-4">
          <Radio className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-foreground font-medium">{error}</p>
          <p className="text-muted-foreground text-sm mt-2">
            The stream will appear when it goes live
          </p>
        </div>
      )}

      {/* Live badge */}
      {isLive && !error && (
        <div className="absolute top-4 left-4">
          <Badge variant="destructive" className="gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </Badge>
        </div>
      )}

      {/* Title */}
      {title && (
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="max-w-[200px] truncate">
            {title}
          </Badge>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="text-white hover:bg-white/20"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/20"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <Slider
              className="w-20"
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
            />
          </div>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20"
          >
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LivepeerPlayer;
