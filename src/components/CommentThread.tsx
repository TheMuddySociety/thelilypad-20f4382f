import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { User, Trash2, MoreVertical, Reply, ChevronDown, ChevronUp, Send } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface CommentData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: CommentData[];
}

interface CommentThreadProps {
  comment: CommentData;
  currentUserId: string | null;
  clipId: string;
  onDelete: (commentId: string) => void;
  onReplyAdded: () => void;
  depth?: number;
}

export const CommentThread = ({
  comment,
  currentUserId,
  clipId,
  onDelete,
  onReplyAdded,
  depth = 0,
}: CommentThreadProps) => {
  const { toast } = useToast();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(depth < 2);

  const hasReplies = comment.replies && comment.replies.length > 0;
  const maxDepth = 3;

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !currentUserId) {
      if (!currentUserId) {
        toast({
          title: "Sign in required",
          description: "Please sign in to reply.",
          variant: "destructive",
        });
      }
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("clip_comments").insert({
      clip_id: clipId,
      user_id: currentUserId,
      content: replyContent.trim(),
      parent_id: comment.id,
    });

    if (error) {
      console.error("Error posting reply:", error);
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      });
    } else {
      setReplyContent("");
      setShowReplyInput(false);
      onReplyAdded();
      toast({
        title: "Reply posted!",
        description: "Your reply has been added.",
      });
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <Link to={`/streamer/${comment.user_id}`} className="shrink-0">
        <Avatar className={depth > 0 ? "h-7 w-7" : "h-9 w-9"}>
          {comment.profile?.avatar_url ? (
            <AvatarImage src={comment.profile.avatar_url} />
          ) : (
            <AvatarFallback>
              <User className={depth > 0 ? "h-3 w-3" : "h-4 w-4"} />
            </AvatarFallback>
          )}
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/streamer/${comment.user_id}`}
              className="font-medium text-sm hover:text-primary transition-colors"
            >
              {comment.profile?.display_name || "Anonymous"}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          {currentUserId === comment.user_id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(comment.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <p className="text-sm mt-1">{comment.content}</p>

        {/* Reply Button & Toggle Replies */}
        <div className="flex items-center gap-3 mt-2">
          {depth < maxDepth && currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}
          {hasReplies && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide replies ({comment.replies!.length})
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show replies ({comment.replies!.length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Reply Input */}
        <AnimatePresence>
          {showReplyInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex gap-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyContent("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || submitting}
                >
                  <Send className="h-3 w-3 mr-1" />
                  {submitting ? "Posting..." : "Reply"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nested Replies */}
        <AnimatePresence>
          {showReplies && hasReplies && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pl-3 border-l-2 border-border/50 space-y-3 overflow-hidden"
            >
              {comment.replies!.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  clipId={clipId}
                  onDelete={onDelete}
                  onReplyAdded={onReplyAdded}
                  depth={depth + 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
