import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ContentType = "text" | "image" | "collection_name" | "collection_description" | "trait_name" | "comment";

interface ModerationResult {
  is_safe: boolean;
  score: number;
  reasons: string[];
  details: Record<string, any>;
  blocked_pattern_match?: string;
}

interface ModerationResponse {
  result: ModerationResult;
  action: "approved" | "blocked" | "flagged" | "review";
  blocked_pattern?: string;
  error?: string;
}

export function useContentModeration() {
  const [isChecking, setIsChecking] = useState(false);
  const [blockedPatterns, setBlockedPatterns] = useState<string[]>([]);

  // Fetch blocked patterns for client-side quick check
  const fetchBlockedPatterns = useCallback(async () => {
    const { data } = await supabase
      .from("blocked_patterns")
      .select("pattern")
      .eq("is_active", true);
    
    if (data) {
      setBlockedPatterns(data.map(p => p.pattern.toLowerCase()));
    }
  }, []);

  // Quick client-side check (for instant feedback)
  const quickCheck = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase();
    return !blockedPatterns.some(pattern => lowerText.includes(pattern));
  }, [blockedPatterns]);

  // Full moderation check via edge function
  const moderateContent = useCallback(async (
    contentType: ContentType,
    contentText?: string,
    contentUrl?: string,
    referenceId?: string,
    referenceTable?: string
  ): Promise<ModerationResponse | null> => {
    if (!contentText && !contentUrl) return null;

    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("content-moderation", {
        body: {
          content_type: contentType,
          content_text: contentText,
          content_url: contentUrl,
          reference_id: referenceId,
          reference_table: referenceTable,
        },
      });

      if (error) {
        console.error("Moderation error:", error);
        
        // Handle rate limiting
        if (error.message?.includes("429")) {
          toast.error("Too many requests. Please wait a moment.");
          return null;
        }
        
        // Handle payment required
        if (error.message?.includes("402")) {
          toast.error("AI moderation service unavailable.");
          return null;
        }
        
        throw error;
      }

      return data as ModerationResponse;
    } catch (err) {
      console.error("Content moderation failed:", err);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Validate and moderate (returns true if content is allowed)
  const validateContent = useCallback(async (
    contentType: ContentType,
    text: string,
    showToast = true
  ): Promise<boolean> => {
    // Quick client check first
    if (!quickCheck(text)) {
      if (showToast) {
        toast.error("Content contains inappropriate language");
      }
      return false;
    }

    // Full AI moderation
    const response = await moderateContent(contentType, text);
    
    if (!response) {
      // If moderation fails, allow but log warning
      console.warn("Moderation check failed, allowing content");
      return true;
    }

    if (response.action === "blocked") {
      if (showToast) {
        toast.error("Content was blocked: Contains inappropriate material");
      }
      return false;
    }

    if (response.action === "flagged") {
      if (showToast) {
        toast.warning("Content flagged for review. It may be moderated.");
      }
      // Still allow but warn
      return true;
    }

    return true;
  }, [quickCheck, moderateContent]);

  return {
    isChecking,
    fetchBlockedPatterns,
    quickCheck,
    moderateContent,
    validateContent,
    blockedPatterns,
  };
}
