import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Heart, HeartOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimisticToggle } from "@/hooks/useOptimisticUpdate";
import { toast } from "@/hooks/use-toast";

interface FollowButtonProps {
  streamerId: string;
  onFollowChange?: (isFollowing: boolean) => void;
  variant?: "default" | "compact";
}

export const FollowButton = ({ streamerId, onFollowChange, variant = "default" }: FollowButtonProps) => {
  const [initialLoading, setInitialLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const { isActive: isFollowing, isOptimistic, toggle, reset } = useOptimisticToggle(false, {
    successMessage: undefined, // We handle messages ourselves for follow/unfollow distinction
  });

  useEffect(() => {
    checkFollowStatus();
  }, [streamerId]);

  const checkFollowStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setInitialLoading(false);
        return;
      }

      setUserId(session.user.id);

      if (session.user.id === streamerId) {
        setInitialLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", session.user.id)
        .eq("streamer_id", streamerId)
        .maybeSingle();

      if (error) throw error;
      reset(!!data);
    } catch (error) {
      console.error("Error checking follow status:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleFollow = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      toast({
        title: "Login required",
        description: "Please sign in to follow streamers.",
        variant: "destructive",
      });
      return;
    }

    if (userId === streamerId) {
      return;
    }

    const willFollow = !isFollowing;

    const success = await toggle(async () => {
      if (isFollowing) {
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", userId)
          .eq("streamer_id", streamerId);

        if (error) throw error;
        return false;
      } else {
        const { error } = await supabase
          .from("followers")
          .insert({
            follower_id: userId,
            streamer_id: streamerId,
          });

        if (error) throw error;
        return true;
      }
    });

    if (success) {
      onFollowChange?.(willFollow);
      toast({
        title: willFollow ? "Following!" : "Unfollowed",
        description: willFollow 
          ? "You are now following this streamer." 
          : "You are no longer following this streamer.",
      });
    }
  }, [userId, streamerId, isFollowing, toggle, onFollowChange]);

  // Don't render for own profile
  if (userId === streamerId) {
    return null;
  }

  if (variant === "compact") {
    return (
      <Button
        size="icon"
        variant={isFollowing ? "secondary" : "default"}
        onClick={handleFollow}
        disabled={initialLoading}
        className={`h-8 w-8 transition-all ${isOptimistic ? "scale-110" : ""} ${
          isFollowing ? "bg-red-500/20 hover:bg-red-500/30 text-red-500" : ""
        }`}
      >
        {isFollowing ? (
          <HeartOff className="h-4 w-4" />
        ) : (
          <Heart className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? "secondary" : "default"}
      onClick={handleFollow}
      disabled={initialLoading}
      className={`gap-2 transition-all ${isOptimistic ? "scale-105" : ""} ${
        isFollowing ? "bg-red-500/20 hover:bg-red-500/30 text-red-500 border-red-500/30" : ""
      }`}
    >
      {isFollowing ? (
        <>
          <HeartOff className="h-4 w-4" />
          Unfollow
        </>
      ) : (
        <>
          <Heart className="h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
};
