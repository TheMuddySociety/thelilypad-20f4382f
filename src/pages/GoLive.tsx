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
  Settings
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

interface StreamKey {
  id: string;
  stream_key: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function GoLive() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [streamKeys, setStreamKeys] = useState<StreamKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
      fetchStreamKeys();
    }
  }, [user]);

  const fetchStreamKeys = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("stream_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load stream keys",
        variant: "destructive",
      });
    } else {
      setStreamKeys(data || []);
    }
    setIsLoading(false);
  };

  const createStreamKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your stream key",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    const { error } = await supabase.from("stream_keys").insert({
      user_id: user.id,
      name: newKeyName.trim(),
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create stream key",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Stream key created successfully",
      });
      setNewKeyName("");
      fetchStreamKeys();
    }
    setIsCreating(false);
  };

  const regenerateStreamKey = async (id: string) => {
    const newKey = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { error } = await supabase
      .from("stream_keys")
      .update({ stream_key: newKey })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate stream key",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Stream key regenerated",
      });
      fetchStreamKeys();
    }
  };

  const toggleStreamKey = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("stream_keys")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update stream key",
        variant: "destructive",
      });
    } else {
      fetchStreamKeys();
    }
  };

  const deleteStreamKey = async (id: string) => {
    const { error } = await supabase.from("stream_keys").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete stream key",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Stream key removed",
      });
      fetchStreamKeys();
    }
  };

  const copyToClipboard = async (key: string, id: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: "Copied",
      description: "Stream key copied to clipboard",
    });
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key: string) => {
    return key.slice(0, 4) + "••••••••••••" + key.slice(-4);
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
            <p className="text-muted-foreground">Manage your stream keys and start broadcasting</p>
          </div>

          {/* Stream Server Info */}
          <Card className="glass-card border-border/50 mb-6">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings className="w-5 h-5" />
                Stream Settings
              </CardTitle>
              <CardDescription>Use these settings in your streaming software (OBS, Streamlabs, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">RTMP Server URL</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value="rtmp://live.lilypad.stream/app" 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText("rtmp://live.lilypad.stream/app");
                      toast({ title: "Copied", description: "Server URL copied" });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create New Key */}
          <Card className="glass-card border-border/50 mb-6">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Plus className="w-5 h-5" />
                Create Stream Key
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Stream name (e.g., Gaming Stream, Art Stream)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={createStreamKey} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Key"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stream Keys List */}
          <Card className="glass-card border-border/50">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Key className="w-5 h-5" />
                Your Stream Keys
              </CardTitle>
              <CardDescription>Keep your stream keys private. Anyone with your key can stream to your channel.</CardDescription>
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
              ) : streamKeys.length > 0 ? (
                <div className="space-y-4">
                  {streamKeys.map((key) => (
                    <div key={key.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{key.name}</h3>
                          <Badge variant={key.is_active ? "default" : "secondary"}>
                            {key.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStreamKey(key.id, key.is_active)}
                          >
                            <Radio className={`w-4 h-4 ${key.is_active ? "text-primary" : ""}`} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Regenerate Stream Key?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will invalidate your current stream key. You'll need to update it in your streaming software.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => regenerateStreamKey(key.id)}>
                                  Regenerate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Stream Key?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. You'll need to create a new key to stream again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteStreamKey(key.id)} className="bg-destructive hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          value={showKeys[key.id] ? key.stream_key : maskKey(key.stream_key)}
                          readOnly
                          className="font-mono text-sm flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {showKeys[key.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(key.stream_key, key.id)}
                        >
                          {copiedKey === key.id ? (
                            <CheckCircle className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Created {new Date(key.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No stream keys yet</p>
                  <p className="text-sm">Create your first stream key to start broadcasting</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
