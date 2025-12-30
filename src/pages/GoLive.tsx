import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { BrowserStreamPreview } from "@/components/streaming/BrowserStreamPreview";
import { PipOverlay } from "@/components/streaming/PipOverlay";
import { StreamControls } from "@/components/streaming/StreamControls";
import { useWebRTCStream, StreamSource } from "@/hooks/useWebRTCStream";
import { useStreamPresence } from "@/hooks/useStreamPresence";
import { 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CheckCircle,
  Radio,
  Settings,
  Play,
  ExternalLink,
  Video,
  Monitor,
  Smartphone,
  ImagePlus,
  X,
  Upload,
  Camera,
  Users
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LiveChat } from "@/components/LiveChat";

interface LivepeerStream {
  id: string;
  name: string;
  streamKey: string;
  playbackId: string;
  rtmpIngestUrl: string;
  playbackUrl: string;
  isActive?: boolean;
  createdAt?: number;
  lastSeen?: number;
}

export default function GoLive() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [streams, setStreams] = useState<LivepeerStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newStreamName, setNewStreamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  // Browser stream metadata
  const [browserStreamTitle, setBrowserStreamTitle] = useState("");
  const [browserStreamCategory, setBrowserStreamCategory] = useState("");
  const [browserStreamThumbnail, setBrowserStreamThumbnail] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [streamSource, setStreamSource] = useState<StreamSource>('camera');
  const thumbnailInputRef = React.useRef<HTMLInputElement>(null);

  // WebRTC Browser Streaming
  const {
    isStreaming,
    isConnecting,
    isSwitchingSource,
    isPipEnabled,
    roomId,
    source: currentSource,
    error: webrtcError,
    startStream,
    stopStream,
    switchSource,
    togglePip,
    getMediaStream,
    getPipStream,
  } = useWebRTCStream();

  const [pipStream, setPipStream] = useState<MediaStream | null>(null);

  // Track viewer count for active stream
  const { viewerCount, isConnected: presenceConnected } = useStreamPresence(isStreaming ? roomId : undefined);

  useSEO({
    title: "Go Live | The Lily Pad",
    description: "Start streaming on The Lily Pad. Stream directly from your browser or use OBS for professional broadcasts."
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchStreams();
    }
  }, [user]);

  // Update media stream reference when streaming
  useEffect(() => {
    if (isStreaming) {
      setMediaStream(getMediaStream());
    } else {
      setMediaStream(null);
    }
  }, [isStreaming, getMediaStream]);

  const fetchStreams = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('livepeer-stream', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setStreams(data || []);
    } catch (error: any) {
      console.error('Error fetching streams:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load streams",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const createStream = async () => {
    if (!newStreamName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your stream",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('livepeer-stream', {
        body: { 
          action: 'create',
          name: newStreamName.trim(),
          userId: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Stream Created!",
        description: "Your stream is ready. Use the RTMP URL and stream key in OBS.",
      });
      setNewStreamName("");
      fetchStreams();
    } catch (error: any) {
      console.error('Error creating stream:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create stream",
        variant: "destructive",
      });
    }
    setIsCreating(false);
  };

  const deleteStream = async (streamId: string) => {
    try {
      const { error } = await supabase.functions.invoke('livepeer-stream', {
        body: { 
          action: 'delete',
          streamId 
        }
      });

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Stream removed successfully",
      });
      fetchStreams();
    } catch (error: any) {
      console.error('Error deleting stream:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete stream",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Thumbnail must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setThumbnailFile(file);
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setBrowserStreamThumbnail(previewUrl);
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile || !user) return null;

    setIsUploadingThumbnail(true);
    try {
      const fileExt = thumbnailFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('stream-thumbnails')
        .upload(fileName, thumbnailFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stream-thumbnails')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload thumbnail",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const removeThumbnail = () => {
    if (browserStreamThumbnail) {
      URL.revokeObjectURL(browserStreamThumbnail);
    }
    setBrowserStreamThumbnail(null);
    setThumbnailFile(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const handleBrowserStreamStart = async () => {
    if (!browserStreamTitle.trim()) {
      toast({
        title: "Stream title required",
        description: "Please enter a title for your stream",
        variant: "destructive",
      });
      return;
    }

    // Upload thumbnail if selected
    let thumbnailUrl: string | undefined;
    if (thumbnailFile) {
      const uploadedUrl = await uploadThumbnail();
      if (uploadedUrl) {
        thumbnailUrl = uploadedUrl;
      }
    }
    
    const result = await startStream({
      source: streamSource,
      metadata: {
        title: browserStreamTitle.trim(),
        category: browserStreamCategory || undefined,
        thumbnailUrl,
      },
    });
    if (result) {
      setMediaStream(result.stream);
    }
  };

  const handleBrowserStreamStop = async () => {
    await stopStream();
    setMediaStream(null);
    setBrowserStreamTitle("");
    setBrowserStreamCategory("");
    setStreamSource('camera');
    removeThumbnail();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-8 sm:pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Video className="h-8 w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Go Live</h1>
            </div>
            <p className="text-muted-foreground">Stream from your browser or use OBS for professional broadcasts</p>
          </div>

          <Tabs defaultValue="browser" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="browser" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Browser Stream
              </TabsTrigger>
              <TabsTrigger value="obs" className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                OBS / RTMP
              </TabsTrigger>
            </TabsList>

            {/* Browser Streaming Tab */}
            <TabsContent value="browser" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Preview and Controls */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Stream Details Form */}
                  {!isStreaming && (
                    <Card className="glass-card border-border/50">
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Settings className="w-5 h-5" />
                          Stream Details
                        </CardTitle>
                        <CardDescription>
                          Set your stream title and category before going live
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                        {/* Stream Source Selection */}
                        <div className="space-y-2">
                          <Label>Stream Source</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setStreamSource('camera')}
                              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                                streamSource === 'camera'
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <Camera className="h-6 w-6" />
                              <span className="text-sm font-medium">Camera</span>
                              <span className="text-xs text-muted-foreground">Webcam + Mic</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setStreamSource('screen')}
                              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                                streamSource === 'screen'
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <Monitor className="h-6 w-6" />
                              <span className="text-sm font-medium">Screen</span>
                              <span className="text-xs text-muted-foreground">Screen Share + Mic</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="stream-title">Stream Title *</Label>
                          <Input
                            id="stream-title"
                            placeholder="Enter a title for your stream..."
                            value={browserStreamTitle}
                            onChange={(e) => setBrowserStreamTitle(e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="stream-category">Category</Label>
                          <Select 
                            value={browserStreamCategory} 
                            onValueChange={setBrowserStreamCategory}
                          >
                            <SelectTrigger id="stream-category">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Gaming">Gaming</SelectItem>
                              <SelectItem value="Art">Art</SelectItem>
                              <SelectItem value="Music">Music</SelectItem>
                              <SelectItem value="Just Chatting">Just Chatting</SelectItem>
                              <SelectItem value="NFTs">NFTs</SelectItem>
                              <SelectItem value="DeFi">DeFi</SelectItem>
                              <SelectItem value="Crypto News">Crypto News</SelectItem>
                              <SelectItem value="Education">Education</SelectItem>
                              <SelectItem value="IRL">IRL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Thumbnail Upload */}
                        <div className="space-y-2">
                          <Label>Stream Thumbnail</Label>
                          <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailSelect}
                            className="hidden"
                          />
                          
                          {browserStreamThumbnail ? (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                              <img
                                src={browserStreamThumbnail}
                                alt="Stream thumbnail preview"
                                className="w-full h-full object-cover"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8"
                                onClick={removeThumbnail}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              onClick={() => thumbnailInputRef.current?.click()}
                              className="w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-2 bg-muted/50 transition-colors"
                            >
                              <ImagePlus className="h-8 w-8 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Click to upload thumbnail</p>
                              <p className="text-xs text-muted-foreground">Recommended: 1280x720 (16:9)</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Stream Preview */}
                  <Card className="glass-card border-border/50">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Video className="w-5 h-5" />
                          {isStreaming ? browserStreamTitle || 'Live Stream' : 'Camera Preview'}
                        </CardTitle>
                        {isStreaming && (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-500 text-white">
                              <Radio className="w-3 h-3 mr-1 animate-pulse" />
                              LIVE
                            </Badge>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {presenceConnected ? viewerCount : '...'}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardDescription>
                        {isStreaming 
                          ? `You're live${currentSource === 'screen' ? ' (Screen Share)' : ' (Camera)'}! ${browserStreamCategory ? `Category: ${browserStreamCategory}` : ''}`
                          : "Click 'Go Live' to start streaming from your camera."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                      <div className="relative">
                        <BrowserStreamPreview 
                          stream={mediaStream}
                          isLive={isStreaming}
                          className="aspect-video"
                        />
                        {/* PiP Camera Overlay */}
                        <PipOverlay
                          stream={pipStream}
                          isVisible={isPipEnabled && currentSource === 'screen'}
                          onClose={async () => {
                            await togglePip();
                            setPipStream(null);
                          }}
                        />
                      </div>
                      
                      {/* Source Switcher - Only visible while streaming */}
                      {isStreaming && (
                        <div className="flex flex-wrap items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground mr-2">Switch to:</span>
                          <Button
                            variant={currentSource === 'camera' ? 'default' : 'outline'}
                            size="sm"
                            onClick={async () => {
                              if (currentSource !== 'camera') {
                                // Disable PiP when switching to camera
                                if (isPipEnabled) {
                                  await togglePip();
                                  setPipStream(null);
                                }
                                const newStream = await switchSource('camera');
                                if (newStream) setMediaStream(newStream);
                              }
                            }}
                            disabled={isSwitchingSource || currentSource === 'camera'}
                            className="gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            Camera
                          </Button>
                          <Button
                            variant={currentSource === 'screen' ? 'default' : 'outline'}
                            size="sm"
                            onClick={async () => {
                              if (currentSource !== 'screen') {
                                const newStream = await switchSource('screen');
                                if (newStream) setMediaStream(newStream);
                              }
                            }}
                            disabled={isSwitchingSource || currentSource === 'screen'}
                            className="gap-2"
                          >
                            <Monitor className="h-4 w-4" />
                            Screen
                          </Button>
                          
                          {/* PiP Toggle - Only when screen sharing */}
                          {currentSource === 'screen' && (
                            <Button
                              variant={isPipEnabled ? 'default' : 'outline'}
                              size="sm"
                              onClick={async () => {
                                const stream = await togglePip();
                                setPipStream(stream);
                              }}
                              className="gap-2 ml-2"
                            >
                              <Camera className="h-4 w-4" />
                              {isPipEnabled ? 'Hide Cam' : 'Show Cam'}
                            </Button>
                          )}
                          
                          {isSwitchingSource && (
                            <span className="text-xs text-muted-foreground animate-pulse">Switching...</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Stream Controls */}
                  <StreamControls
                    isStreaming={isStreaming}
                    isConnecting={isConnecting}
                    roomId={roomId}
                    onStart={handleBrowserStreamStart}
                    onStop={handleBrowserStreamStop}
                  />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Info Card */}
                  <Card className="glass-card border-border/50 bg-primary/5">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Smartphone className="w-5 h-5" />
                        Browser Streaming
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 space-y-3 text-sm">
                      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        <li>Works on <strong className="text-foreground">desktop and mobile</strong></li>
                        <li>No software required</li>
                        <li>Uses your device's camera & mic</li>
                        <li>Share link with viewers instantly</li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Live Chat (when streaming) */}
                  {isStreaming && roomId && (
                    <Card className="h-[400px] flex flex-col glass-card border-border/50">
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-base">Live Chat</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 p-0 overflow-hidden">
                        <LiveChat playbackId={roomId} className="h-full" />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* OBS / RTMP Tab */}
            <TabsContent value="obs" className="space-y-6">
              {/* OBS Setup Guide */}
              <Card className="glass-card border-border/50 bg-primary/5">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Settings className="w-5 h-5" />
                    OBS Setup Guide
                  </CardTitle>
                  <CardDescription>Follow these steps to stream with OBS</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 text-sm">
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Create a stream below to get your RTMP URL and Stream Key</li>
                    <li>Open OBS → Settings → Stream</li>
                    <li>Set Service to <strong className="text-foreground">Custom</strong></li>
                    <li>Paste the <strong className="text-foreground">RTMP URL</strong> as the Server</li>
                    <li>Paste your <strong className="text-foreground">Stream Key</strong></li>
                    <li>Click "Start Streaming" in OBS</li>
                  </ol>
                </CardContent>
              </Card>

              {/* Create New Stream */}
              <Card className="glass-card border-border/50">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Plus className="w-5 h-5" />
                    Create New Stream
                  </CardTitle>
                  <CardDescription>Create a Livepeer stream to get your RTMP credentials</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="Stream name (e.g., Gaming Stream, Art Stream)"
                      value={newStreamName}
                      onChange={(e) => setNewStreamName(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && createStream()}
                    />
                    <Button onClick={createStream} disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Stream"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Streams List */}
              <Card className="glass-card border-border/50">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Key className="w-5 h-5" />
                        Your Streams
                      </CardTitle>
                      <CardDescription>Manage your Livepeer streams</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchStreams}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="p-4 rounded-lg bg-muted/50">
                          <Skeleton className="h-5 w-32 mb-3" />
                          <Skeleton className="h-10 w-full mb-3" />
                          <Skeleton className="h-8 w-48" />
                        </div>
                      ))}
                    </div>
                  ) : streams.length > 0 ? (
                    <div className="space-y-6">
                      {streams.map((stream) => (
                        <div key={stream.id} className="p-4 rounded-lg bg-muted/50 space-y-4">
                          {/* Stream Header */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{stream.name}</h3>
                              <Badge variant={stream.isActive ? "default" : "secondary"} className={stream.isActive ? "bg-green-500" : ""}>
                                {stream.isActive ? (
                                  <>
                                    <Radio className="w-3 h-3 mr-1 animate-pulse" />
                                    LIVE
                                  </>
                                ) : (
                                  "Offline"
                                )}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              {stream.isActive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/watch/${stream.playbackId}`)}
                                >
                                  <Play className="w-4 h-4 mr-1" />
                                  Watch
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Stream?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this stream and its stream key.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteStream(stream.id)} className="bg-destructive hover:bg-destructive/90">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {/* RTMP URL */}
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">RTMP Server URL (paste in OBS)</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={stream.rtmpIngestUrl}
                                readOnly
                                className="font-mono text-sm flex-1"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(stream.rtmpIngestUrl, `rtmp-${stream.id}`)}
                              >
                                {copiedKey === `rtmp-${stream.id}` ? (
                                  <CheckCircle className="w-4 h-4 text-primary" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Stream Key */}
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Stream Key (keep private!)</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={showKeys[stream.id] ? stream.streamKey : maskKey(stream.streamKey)}
                                readOnly
                                className="font-mono text-sm flex-1"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => toggleKeyVisibility(stream.id)}
                              >
                                {showKeys[stream.id] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(stream.streamKey, stream.id)}
                              >
                                {copiedKey === stream.id ? (
                                  <CheckCircle className="w-4 h-4 text-primary" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Playback URL */}
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Playback URL (for viewers)</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={stream.playbackUrl}
                                readOnly
                                className="font-mono text-xs flex-1"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(stream.playbackUrl, `playback-${stream.id}`)}
                              >
                                {copiedKey === `playback-${stream.id}` ? (
                                  <CheckCircle className="w-4 h-4 text-primary" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => navigate(`/watch/${stream.playbackId}`)}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {stream.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              Created {new Date(stream.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No streams yet</p>
                      <p className="text-sm">Create your first stream to start broadcasting</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
