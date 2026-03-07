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
  // Quick client-side check (deprecated - server-side only for security)
  const quickCheck = useCallback((text: string): boolean => {
    return true;
  }, []);
  // Full moderation check via edge function
  const moderateContent = useCallback(async (
    contentType: ContentType,
    contentText?: string,
    contentUrl?: string,
    imageBase64?: string,
    referenceId?: string,
    referenceTable?: string
  ): Promise<ModerationResponse | null> => {
    if (!contentText && !contentUrl && !imageBase64) return null;

    setIsChecking(true);

    try {
      const { data, error } = await supabase.functions.invoke("content-moderation", {
        body: {
          content_type: contentType,
          content_text: contentText,
          content_url: contentUrl,
          image_base64: imageBase64,
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

  // Moderate image content
  const moderateImage = useCallback(async (
    imageBase64: string,
    imageName?: string
  ): Promise<{ allowed: boolean; reason?: string }> => {
    const response = await moderateContent("image", undefined, undefined, imageBase64);

    if (!response) {
      console.warn("Image moderation check failed, allowing image");
      return { allowed: true };
    }

    if (response.action === "blocked") {
      return {
        allowed: false,
        reason: response.result.reasons.filter(r => r !== "clean").join(", ") || "inappropriate content"
      };
    }

    if (response.action === "flagged") {
      toast.warning(`Image "${imageName || 'uploaded'}" flagged for review`);
      return { allowed: true };
    }

    return { allowed: true };
  }, [moderateContent]);

  // Validate and moderate (returns true if content is allowed)
  const validateContent = useCallback(async (
    contentType: ContentType,
    text: string,
    showToast = true
  ): Promise<boolean> => {

    // Full AI moderation securely performed on edge function
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
  }, [moderateContent]);

  return {
    isChecking,
    fetchBlockedPatterns: async () => { }, // Deprecated
    quickCheck, // Deprecated, always returns true
    moderateContent,
    moderateImage,
    validateContent,
    blockedPatterns: [] as string[], // Deprecated
  };
}
