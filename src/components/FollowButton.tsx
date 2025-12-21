import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, HeartOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  streamerId: string;
  onFollowChange?: (isFollowing: boolean) => void;
  variant?: "default" | "compact";
}

export const FollowButton = ({ streamerId, onFollowChange, variant = "default" }: FollowButtonProps) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkFollowStatus();
  }, [streamerId]);

  const checkFollowStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      // Don't show follow button for own profile
      if (session.user.id === streamerId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", session.user.id)
        .eq("streamer_id", streamerId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error checking follow status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
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

    setLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_id", userId)
          .eq("streamer_id", streamerId);

        if (error) throw error;
        
        setIsFollowing(false);
        onFollowChange?.(false);
        toast({
          title: "Unfollowed",
          description: "You are no longer following this streamer.",
        });
      } else {
        // Follow
        const { error } = await supabase
          .from("followers")
          .insert({
            follower_id: userId,
            streamer_id: streamerId,
          });

        if (error) throw error;
        
        setIsFollowing(true);
        onFollowChange?.(true);
        toast({
          title: "Following!",
          description: "You are now following this streamer.",
        });
      }
    } catch (error: any) {
      console.error("Error updating follow status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update follow status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render for own profile or if not logged in
  if (userId === streamerId) {
    return null;
  }

  if (variant === "compact") {
    return (
      <Button
        size="icon"
        variant={isFollowing ? "secondary" : "default"}
        onClick={handleFollow}
        disabled={loading}
        className={`h-8 w-8 ${isFollowing ? "bg-red-500/20 hover:bg-red-500/30 text-red-500" : ""}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
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
      disabled={loading}
      className={`gap-2 ${isFollowing ? "bg-red-500/20 hover:bg-red-500/30 text-red-500 border-red-500/30" : ""}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
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
