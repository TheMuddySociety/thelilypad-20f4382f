import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ClipReactionsProps {
  clipId: string;
}

interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

const AVAILABLE_EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "👏", "🎉", "💯"];

export const ClipReactions = ({ clipId }: ClipReactionsProps) => {
  const { toast } = useToast();
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const fetchReactions = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch all reactions for this clip
      const { data: reactionsData, error } = await supabase
        .from("clip_reactions")
        .select("emoji, user_id")
        .eq("clip_id", clipId);

      if (error) {
        console.error("Error fetching reactions:", error);
        setLoading(false);
        return;
      }

      // Count reactions by emoji
      const emojiCounts = new Map<string, { count: number; userReacted: boolean }>();
      
      reactionsData?.forEach((reaction) => {
        const existing = emojiCounts.get(reaction.emoji) || { count: 0, userReacted: false };
        emojiCounts.set(reaction.emoji, {
          count: existing.count + 1,
          userReacted: existing.userReacted || reaction.user_id === user?.id,
        });
      });

      const reactionsList: ReactionCount[] = Array.from(emojiCounts.entries())
        .map(([emoji, data]) => ({
          emoji,
          count: data.count,
          hasReacted: data.userReacted,
        }))
        .sort((a, b) => b.count - a.count);

      setReactions(reactionsList);
      setLoading(false);
    };

    fetchReactions();
  }, [clipId]);

  // Real-time subscription for reactions
  useEffect(() => {
    const channel = supabase
      .channel("clip-reactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clip_reactions",
          filter: `clip_id=eq.${clipId}`,
        },
        async () => {
          // Refetch reactions on any change
          const { data: { user } } = await supabase.auth.getUser();
          
          const { data: reactionsData } = await supabase
            .from("clip_reactions")
            .select("emoji, user_id")
            .eq("clip_id", clipId);

          const emojiCounts = new Map<string, { count: number; userReacted: boolean }>();
          
          reactionsData?.forEach((reaction) => {
            const existing = emojiCounts.get(reaction.emoji) || { count: 0, userReacted: false };
            emojiCounts.set(reaction.emoji, {
              count: existing.count + 1,
              userReacted: existing.userReacted || reaction.user_id === user?.id,
            });
          });

          const reactionsList: ReactionCount[] = Array.from(emojiCounts.entries())
            .map(([emoji, data]) => ({
              emoji,
              count: data.count,
              hasReacted: data.userReacted,
            }))
            .sort((a, b) => b.count - a.count);

          setReactions(reactionsList);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clipId]);

  const toggleReaction = async (emoji: string) => {
    if (!currentUserId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to react to clips.",
        variant: "destructive",
      });
      return;
    }

    const existingReaction = reactions.find(r => r.emoji === emoji && r.hasReacted);

    if (existingReaction) {
      // Remove reaction
      const { error } = await supabase
        .from("clip_reactions")
        .delete()
        .eq("clip_id", clipId)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji);

      if (error) {
        console.error("Error removing reaction:", error);
        toast({
          title: "Error",
          description: "Failed to remove reaction.",
          variant: "destructive",
        });
      }
    } else {
      // Add reaction
      const { error } = await supabase
        .from("clip_reactions")
        .insert({
          clip_id: clipId,
          user_id: currentUserId,
          emoji,
        });

      if (error) {
        console.error("Error adding reaction:", error);
        toast({
          title: "Error",
          description: "Failed to add reaction.",
          variant: "destructive",
        });
      }
    }

    setPickerOpen(false);
  };

  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-full bg-muted animate-pulse" />
        <div className="h-8 w-16 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AnimatePresence mode="popLayout">
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.emoji}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            layout
          >
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-3 gap-1.5 rounded-full transition-all",
                reaction.hasReacted && "bg-primary/10 border-primary/50 text-primary"
              )}
              onClick={() => toggleReaction(reaction.emoji)}
            >
              <span className="text-base">{reaction.emoji}</span>
              <span className="text-xs font-medium">{reaction.count}</span>
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Reaction Button */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
          >
            {reactions.length === 0 ? (
              <Smile className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {AVAILABLE_EMOJIS.map((emoji) => {
              const userHasReacted = reactions.find(r => r.emoji === emoji)?.hasReacted;
              return (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 w-9 p-0 text-lg hover:scale-125 transition-transform",
                    userHasReacted && "bg-primary/10"
                  )}
                  onClick={() => toggleReaction(emoji)}
                >
                  {emoji}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
