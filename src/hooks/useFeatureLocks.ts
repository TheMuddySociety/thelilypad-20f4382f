import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureLock {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  required_followers: number;
  required_subscribers: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useFeatureLocks = () => {
  return useQuery({
    queryKey: ["feature-locks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_locks")
        .select("*")
        .order("feature_name");

      if (error) throw error;
      return data as FeatureLock[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useFeatureLock = (featureKey: string) => {
  return useQuery({
    queryKey: ["feature-lock", featureKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_locks")
        .select("*")
        .eq("feature_key", featureKey)
        .maybeSingle();

      if (error) throw error;
      return data as FeatureLock | null;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useFeatureUnlock = (
  featureKey: string,
  followerCount: number,
  subscriberCount: number = 0
) => {
  const { data: featureLock, isLoading } = useFeatureLock(featureKey);

  const isUnlocked =
    featureLock?.is_enabled === false ||
    (followerCount >= (featureLock?.required_followers ?? 0) &&
      subscriberCount >= (featureLock?.required_subscribers ?? 0));

  const progress = featureLock
    ? Math.min(100, (followerCount / featureLock.required_followers) * 100)
    : 0;

  return {
    isUnlocked,
    isLoading,
    featureLock,
    progress,
    requiredFollowers: featureLock?.required_followers ?? 0,
    requiredSubscribers: featureLock?.required_subscribers ?? 0,
    isFeatureEnabled: featureLock?.is_enabled ?? true,
  };
};
