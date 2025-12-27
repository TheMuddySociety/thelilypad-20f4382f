import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
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
  ExternalLink
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

  useSEO({
    title: "Go Live | The Lily Pad",
    description: "Start streaming on The Lily Pad. Get your RTMP credentials, set up OBS, and broadcast to your community in minutes."
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-8 sm:pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Go Live</h1>
            <p className="text-muted-foreground">Create streams and broadcast using OBS or any RTMP software</p>
          </div>

          {/* OBS Setup Guide */}
          <Card className="glass-card border-border/50 mb-6 bg-primary/5">
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
          <Card className="glass-card border-border/50 mb-6">
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
                              onClick={() => window.open(`https://lvpr.tv/?v=${stream.playbackId}`, '_blank')}
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
                            onClick={() => window.open(`https://lvpr.tv/?v=${stream.playbackId}`, '_blank')}
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
        </div>
      </main>
    </div>
  );
}
