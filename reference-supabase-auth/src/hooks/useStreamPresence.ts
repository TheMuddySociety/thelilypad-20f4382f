import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
    viewerCount: number;
    isConnected: boolean;
}

export const useStreamPresence = (streamId: string | undefined) => {
    const [state, setState] = useState<PresenceState>({
        viewerCount: 0,
        isConnected: false,
    });
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);

    const updateViewerCount = useCallback((presenceState: Record<string, unknown[]>) => {
        // Count unique viewers across all presence keys
        const viewers = Object.values(presenceState).flat();
        setState(prev => ({ ...prev, viewerCount: viewers.length }));
    }, []);

    useEffect(() => {
        if (!streamId) return;

        const channelName = `stream:${streamId}`;
        const presenceChannel = supabase.channel(channelName, {
            config: {
                presence: {
                    key: crypto.randomUUID(),
                },
            },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = presenceChannel.presenceState();
                updateViewerCount(presenceState);
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                console.log('Viewer joined:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log('Viewer left:', leftPresences);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track this viewer's presence
                    await presenceChannel.track({
                        joined_at: new Date().toISOString(),
                        user_agent: navigator.userAgent.slice(0, 50),
                    });
                    setState(prev => ({ ...prev, isConnected: true }));
                }
            });

        setChannel(presenceChannel);

        return () => {
            presenceChannel.unsubscribe();
            setState({ viewerCount: 0, isConnected: false });
        };
    }, [streamId, updateViewerCount]);

    return {
        viewerCount: state.viewerCount,
        isConnected: state.isConnected,
    };
};
