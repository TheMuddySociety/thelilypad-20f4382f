'use client';

import { useState, useEffect } from 'react';
import { useWebRTCStream } from '@/hooks/useWebRTCStream';
import { useAdaptiveStreamQuality } from '@/hooks/useAdaptiveStreamQuality';
import { BrowserStreamPreview } from '@/components/streaming/BrowserStreamPreview';
import { StreamControls } from '@/components/streaming/StreamControls';
import { PipOverlay } from '@/components/streaming/PipOverlay';
import LiveChat from '@/components/chat/LiveChat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { redirect } from 'next/navigation';

export default function GoLivePage() {
    const { user } = useAuth();

    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<string>('Just Chatting');
    const [quality, setQuality] = useState<'480p' | '720p' | '1080p'>('720p');
    const [source, setSource] = useState<'camera' | 'screen'>('camera');

    const stream = useWebRTCStream();

    // Adaptive Quality
    const { checkConnectionQuality } = useAdaptiveStreamQuality({
        enabled: stream.isStreaming,
        currentQuality: quality,
        onQualityChange: (newQuality) => {
            setQuality(newQuality);
            // Note: In a real implementation, we would restart the stream with new constraints
            // or renegotiate the connection. For now we just update the state.
        },
    });

    const handleStartStream = async () => {
        if (!title.trim()) {
            toast.error('Please enter a stream title');
            return;
        }

        await stream.startStream({
            metadata: {
                title,
                category,
            },
            source,
            quality,
        });
    };

    useEffect(() => {
        if (!user) {
            // Redirect to login if not authenticated (though AuthProvider might handle this)
            // For now, we'll just let the UI show "Sign in" or similar if needed, 
            // but typically this page should be protected.
            // redirect('/login'); 
        }
    }, [user]);

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex flex-col md:flex-row gap-6">

                {/* Main Stream Area */}
                <div className="flex-1 space-y-6">
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
                        <BrowserStreamPreview
                            stream={stream.getMediaStream()}
                            isLive={stream.isStreaming}
                            className="w-full h-full"
                        />

                        <PipOverlay
                            stream={stream.getPipStream()}
                            isVisible={stream.isPipEnabled}
                            onClose={() => stream.togglePip()}
                        />
                    </div>

                    <StreamControls
                        isStreaming={stream.isStreaming}
                        isConnecting={stream.isConnecting}
                        roomId={stream.roomId}
                        onStart={handleStartStream}
                        onStop={stream.stopStream}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>Stream Settings</CardTitle>
                            <CardDescription>Configure your stream details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Stream Title</Label>
                                <Input
                                    id="title"
                                    placeholder="Enter a catchy title..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    disabled={stream.isStreaming}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Category</Label>
                                    <Select value={category} onValueChange={setCategory} disabled={stream.isStreaming}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Just Chatting">Just Chatting</SelectItem>
                                            <SelectItem value="Gaming">Gaming</SelectItem>
                                            <SelectItem value="Art">Art</SelectItem>
                                            <SelectItem value="Music">Music</SelectItem>
                                            <SelectItem value="Tech">Tech</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>Quality</Label>
                                    <Select
                                        value={quality}
                                        onValueChange={(v: any) => setQuality(v)}
                                        disabled={stream.isStreaming}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select quality" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1080p">1080p (High)</SelectItem>
                                            <SelectItem value="720p">720p (Good)</SelectItem>
                                            <SelectItem value="480p">480p (Low)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Source</Label>
                                    <Select
                                        value={source}
                                        onValueChange={(v: 'camera' | 'screen') => {
                                            setSource(v);
                                            if (stream.isStreaming) {
                                                stream.switchSource(v);
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select source" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="camera">Camera</SelectItem>
                                            <SelectItem value="screen">Screen Share</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {source === 'screen' && stream.isStreaming && (
                                    <div className="flex items-end">
                                        <Button
                                            variant={stream.isPipEnabled ? "destructive" : "secondary"}
                                            onClick={() => stream.togglePip()}
                                            className="w-full"
                                        >
                                            {stream.isPipEnabled ? "Disable Camera Overlay" : "Enable Camera Overlay"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Chat Sidebar */}
                <div className="w-full md:w-80 h-[600px] md:h-auto border rounded-xl overflow-hidden bg-card">
                    {stream.roomId ? (
                        <LiveChat playbackId={stream.roomId} className="h-full" />
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground p-4 text-center">
                            <div className="space-y-2">
                                <MessageCircle className="h-10 w-10 mx-auto opacity-20" />
                                <p>Chat will appear here when you go live</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
