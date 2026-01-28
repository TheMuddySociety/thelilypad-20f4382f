import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, Monitor, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BrowserStreamPreviewProps {
    stream: MediaStream | null;
    isLive: boolean;
    className?: string;
}

export const BrowserStreamPreview: React.FC<BrowserStreamPreviewProps> = ({
    stream,
    isLive,
    className,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => {
                track.enabled = !isVideoEnabled;
            });
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                videoRef.current.requestFullscreen();
            }
        }
    };

    return (
        <div className={cn('relative bg-black rounded-lg overflow-hidden', className)}>
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={cn(
                    'w-full h-full object-cover',
                    !isVideoEnabled && 'opacity-0'
                )}
            />

            {/* No video fallback */}
            {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <CameraOff className="h-16 w-16 text-muted-foreground" />
                </div>
            )}

            {/* Live indicator */}
            {isLive && (
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        LIVE
                    </span>
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                    onClick={toggleMute}
                >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                    onClick={toggleVideo}
                >
                    {isVideoEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                >
                    <Maximize2 className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
};
