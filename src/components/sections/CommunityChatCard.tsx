import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Send, MessageCircle, Users, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const COMMUNITY_CHAT_ID = 'community-lounge';

interface ChatMessage {
  id: string;
  playback_id: string;
  user_id: string;
  username: string;
  message: string;
  message_type: 'text' | 'sticker' | 'emoji';
  sticker_url?: string | null;
  sticker_name?: string | null;
  created_at: string;
}

export const CommunityChatCard: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('stream_chat_messages')
        .select('*')
        .eq('playback_id', COMMUNITY_CHAT_ID)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages((data as ChatMessage[]) || []);
      }
      setIsLoading(false);
    };

    fetchMessages();
  }, []);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${COMMUNITY_CHAT_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_chat_messages',
          filter: `playback_id=eq.${COMMUNITY_CHAT_ID}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'stream_chat_messages',
          filter: `playback_id=eq.${COMMUNITY_CHAT_ID}`
        },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages(prev => prev.filter(m => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Track presence for viewer count
  useEffect(() => {
    const presenceChannel = supabase.channel(`presence-${COMMUNITY_CHAT_ID}`, {
      config: {
        presence: {
          key: user?.id || `anon-${Math.random().toString(36).slice(2)}`
        }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user?.id]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    if (!user) {
      toast.error('Please sign in to chat');
      return;
    }

    if (newMessage.length > 500) {
      toast.error('Message too long (max 500 characters)');
      return;
    }

    setIsSending(true);
    
    const { error } = await supabase
      .from('stream_chat_messages')
      .insert({
        playback_id: COMMUNITY_CHAT_ID,
        user_id: user.id,
        username: user.email?.split('@')[0] || 'Anonymous',
        message: newMessage.trim(),
        message_type: 'text'
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
    }
    
    setIsSending(false);
  };

  const getAvatarColor = (username: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 
      'bg-yellow-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm h-full">
        {/* Retro gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10 opacity-50" />
        
        <CardContent className="relative p-0 flex flex-col h-[400px]">
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-background/80 text-primary">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Community Lounge</h3>
                  <p className="text-xs text-muted-foreground">Chat with fellow collectors</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Users className="h-3 w-3" />
                {viewerCount} online
              </div>
            </div>
          </div>

          {/* Messages area */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    No messages yet. Be the first to chat!
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex gap-2 group">
                      <Avatar className={`h-6 w-6 flex-shrink-0 ${getAvatarColor(msg.username)}`}>
                        <AvatarFallback className="text-xs text-white">
                          {msg.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-sm truncate text-foreground">
                            {msg.username}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {msg.message_type === 'sticker' || msg.message_type === 'emoji' ? (
                          <img 
                            src={msg.sticker_url || ''} 
                            alt={msg.sticker_name || 'Sticker'} 
                            className="max-w-24 max-h-24 rounded object-contain"
                          />
                        ) : (
                          <p className="text-sm text-foreground/90 break-words">
                            {msg.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input area */}
          <div className="p-3 border-t border-border/50 bg-background/30">
            {!user ? (
              <Link to="/auth">
                <Button variant="outline" className="w-full gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign in to join the conversation
                </Button>
              </Link>
            ) : (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Say something..."
                  maxLength={500}
                  disabled={isSending}
                  className="flex-1 bg-background/50"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isSending || !newMessage.trim()}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
