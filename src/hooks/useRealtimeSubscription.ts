import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeSubscriptionOptions {
  table: string;
  event?: PostgresEvent;
  schema?: string;
  filter?: string;
  onUpdate: (payload?: any) => void;
  enabled?: boolean;
}

/**
 * Custom hook for Supabase realtime subscriptions
 * Automatically handles channel cleanup on unmount
 */
export const useRealtimeSubscription = ({
  table,
  event = "*",
  schema = "public",
  filter,
  onUpdate,
  enabled = true,
}: UseRealtimeSubscriptionOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${event}-${Date.now()}`;
    
    const channelConfig: {
      event: PostgresEvent;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema,
      table,
    };
    
    if (filter) {
      channelConfig.filter = filter;
    }
    
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        channelConfig,
        (payload: any) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, schema, filter, enabled]);

  return channelRef.current;
};

/**
 * Hook for subscribing to multiple tables at once
 */
interface MultiTableSubscription {
  table: string;
  event?: PostgresEvent;
  filter?: string;
}

export const useMultiTableSubscription = (
  subscriptions: MultiTableSubscription[],
  onUpdate: () => void,
  enabled: boolean = true
) => {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) return;

    const channels = subscriptions.map((sub, index) => {
      const channelName = `multi-realtime-${sub.table}-${index}-${Date.now()}`;
      
      const channelConfig: {
        event: PostgresEvent;
        schema: string;
        table: string;
        filter?: string;
      } = {
        event: sub.event || "*",
        schema: "public",
        table: sub.table,
      };
      
      if (sub.filter) {
        channelConfig.filter = sub.filter;
      }
      
      return supabase
        .channel(channelName)
        .on(
          "postgres_changes" as any,
          channelConfig,
          () => onUpdate()
        )
        .subscribe();
    });

    channelsRef.current = channels;

    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [JSON.stringify(subscriptions), enabled]);

  return channelsRef.current;
};
