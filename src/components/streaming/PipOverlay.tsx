import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Move, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PipOverlayProps {
  stream: MediaStream | null;
  isVisible: boolean;
  onClose?: () => void;
  className?: string;
}

type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const PipOverlay: React.FC<PipOverlayProps> = ({
  stream,
  isVisible,
  onClose,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [position, setPosition] = useState<Position>('bottom-right');

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!isVisible || !stream) return null;

  const positionClasses: Record<Position, string> = {
    'top-left': 'top-3 left-3',
    'top-right': 'top-3 right-3',
    'bottom-left': 'bottom-3 left-3',
    'bottom-right': 'bottom-3 right-3',
  };

  const cyclePosition = () => {
    const positions: Position[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];
    const currentIndex = positions.indexOf(position);
    const nextIndex = (currentIndex + 1) % positions.length;
    setPosition(positions[nextIndex]);
  };

  return (
    <div
      className={cn(
        'absolute z-10 transition-all duration-300 ease-in-out',
        positionClasses[position],
        className
      )}
    >
      <div className="relative group">
        {/* Video Container */}
        <div className="w-32 h-24 sm:w-40 sm:h-30 rounded-lg overflow-hidden border-2 border-primary shadow-lg bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>

        {/* Controls Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded-lg">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={cyclePosition}
            title="Move position"
          >
            <Move className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-red-500/50"
              onClick={onClose}
              title="Disable camera overlay"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Live indicator */}
        <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-white font-medium">CAM</span>
        </div>
      </div>
    </div>
  );
};
