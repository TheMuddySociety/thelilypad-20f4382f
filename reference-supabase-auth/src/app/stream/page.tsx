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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { useWalletConnection } from '@solana/react-hooks';
import { supabase } from '@/lib/supabase';
import { MessageCircle, Loader2, Wallet, Lock } from 'lucide-react';

export default function GoLivePage() {
    const { user, loading: authLoading } = useAuth();
    const { connected } = useWalletConnection();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

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

    const handleSignIn = async () => {
        try {
            setIsAuthenticating(true);
            const { data, error } = await supabase.auth.signInWithWeb3({
                chain: 'solana',
                statement: 'Sign in to The Lily Pad Streaming Server',
            });

            if (error) {
                toast.error('Authentication failed: ' + error.message);
            } else if (data?.user) {
                toast.success('Signed in successfully!');
            }
        } catch (error: any) {
            toast.error('Failed to sign in: ' + error.message);
        } finally {
            setIsAuthenticating(false);
        }
    };

    // Show loading while checking auth state
    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Auth & Wallet Check
    if (!user) {
        return (
            <div className="container mx-auto max-w-2xl p-4 pt-20">
                <Card className="border-destructive/50 bg-destructive/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <Lock className="h-5 w-5" />
                            Authentication Required
                        </CardTitle>
                        <CardDescription className="text-foreground/90 font-medium">
                            {connected
                                ? "You are connected to Solana, but not signed into the streaming server."
                                : "You must connect your wallet and sign in to stream."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Please ensure you have completed the sign-in process to access the Go Live dashboard.
                        </p>

                        <div className="flex flex-col gap-3">
                            {!connected ? (
                                <div className="p-4 bg-background/50 rounded-lg border text-center">
                                    <p className="mb-2 text-sm font-medium">Step 1: Connect Wallet</p>
                                    <p className="text-xs text-muted-foreground">Use the wallet button in the top navigation bar to connect.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 p-2 rounded">
                                        <Wallet className="h-4 w-4" />
                                        <span>Wallet Connected to Solana</span>
                                    </div>
                                    <Button
                                        onClick={handleSignIn}
                                        disabled={isAuthenticating}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {isAuthenticating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Signing In...
                                            </>
                                        ) : (
                                            "Sign In to Streaming Server"
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
