import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Key, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";

interface StreamKey {
    id: string;
    stream_key: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const StreamKeyManager = ({ userId }: { userId: string }) => {
    const { toast } = useToast();
    const [streamKeys, setStreamKeys] = useState<StreamKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showKey, setShowKey] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (userId) {
            fetchStreamKeys();
        }
    }, [userId]);

    const fetchStreamKeys = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('stream_keys')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStreamKeys(data || []);
        } catch (error) {
            console.error('Error fetching stream keys:', error);
            toast({
                title: "Error fetching stream keys",
                description: "Please try again later.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const generateNewKey = async () => {
        setIsGenerating(true);
        try {
            // First, get an existing key just to check if we should update or insert
            // Or we can just insert a new one and maybe set the old ones to inactive (if we want 1 active key)
            const { data, error } = await supabase
                .from('stream_keys')
                .insert({
                    user_id: userId,
                    name: 'Main Stream Key',
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;

            toast({
                title: "Success",
                description: "New stream key generated.",
            });

            fetchStreamKeys();
        } catch (error) {
            console.error('Error generating stream key:', error);
            toast({
                title: "Error generating stream key",
                description: "Please try again later.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({
                title: "Copied!",
                description: "Stream key copied to clipboard.",
                duration: 2000,
            });
        } catch (err) {
            toast({
                title: "Failed to copy",
                description: "Please try selecting the text manually.",
                variant: "destructive",
            });
        }
    };

    const toggleVisibility = (id: string) => {
        setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (isLoading) {
        return (
            <Card className="glass-card border-border/50 h-full">
                <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        Stream Key
                    </CardTitle>
                    <CardDescription>Loading stream credentials...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    const activeKey = streamKeys.find(k => k.is_active) || streamKeys[0];

    return (
        <Card className="glass-card border-border/50 h-full flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        Stream Credentials
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={generateNewKey}
                        disabled={isGenerating}
                        className="text-xs h-8"
                    >
                        {isGenerating ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                        Reset Key
                    </Button>
                </CardTitle>
                <CardDescription>
                    Use these credentials in OBS or other streaming software.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
                {activeKey ? (
                    <>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Server URL</label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value="rtmp://live.thelilypad.xyz/app"
                                    className="font-mono text-xs bg-muted/50"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={() => copyToClipboard("rtmp://live.thelilypad.xyz/app")}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Stream Key</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        readOnly
                                        type={showKey[activeKey.id] ? "text" : "password"}
                                        value={activeKey.stream_key}
                                        className="font-mono text-xs bg-muted/50 pr-10"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => toggleVisibility(activeKey.id)}
                                    >
                                        {showKey[activeKey.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </Button>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={() => copyToClipboard(activeKey.stream_key)}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground tracking-tight mt-1">
                                Keep your stream key private. Anyone with this key can stream to your channel.
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-6 flex flex-col items-center justify-center h-full gap-3">
                        <Key className="w-8 h-8 text-muted-foreground/30" />
                        <div className="text-sm text-muted-foreground">No stream key generated yet.</div>
                        <Button onClick={generateNewKey} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
                            Generate First Key
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
