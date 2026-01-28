import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ChannelEmote {
    id: string;
    streamer_id: string;
    name: string;
    image_url: string;
}

interface StreamerWithEmotes {
    streamerId: string;
    streamerName: string;
    emotes: ChannelEmote[];
}

export function useChannelEmotes(userId: string | null) {
    const [streamerEmotes, setStreamerEmotes] = useState<StreamerWithEmotes[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            fetchFollowedStreamersEmotes();
        } else {
            setStreamerEmotes([]);
            setLoading(false);
        }
    }, [userId]);

    const fetchFollowedStreamersEmotes = async () => {
        if (!userId) return;

        try {
            // Get streamers the user follows
            const { data: follows, error: followsError } = await supabase
                .from("followers")
                .select("streamer_id")
                .eq("follower_id", userId);

            if (followsError) throw followsError;

            if (!follows || follows.length === 0) {
                setStreamerEmotes([]);
                setLoading(false);
                return;
            }

            const streamerIds = follows.map((f) => f.streamer_id);

            // Get emotes for followed streamers
            const { data: emotes, error: emotesError } = await supabase
                .from("channel_emotes")
                .select("*")
                .in("streamer_id", streamerIds)
                .eq("is_active", true);

            if (emotesError) throw emotesError;

            // Get streamer profiles
            const { data: profiles, error: profilesError } = await supabase
                .from("streamer_profiles")
                .select("user_id, display_name")
                .in("user_id", streamerIds);

            if (profilesError) throw profilesError;

            // Group emotes by streamer
            const groupedEmotes: StreamerWithEmotes[] = [];

            streamerIds.forEach((streamerId) => {
                const streamerEmotes = (emotes || []).filter(
                    (e) => e.streamer_id === streamerId
                );

                if (streamerEmotes.length > 0) {
                    const profile = profiles?.find((p) => p.user_id === streamerId);
                    groupedEmotes.push({
                        streamerId,
                        streamerName: profile?.display_name || "Unknown",
                        emotes: streamerEmotes,
                    });
                }
            });

            setStreamerEmotes(groupedEmotes);
        } catch (error) {
            console.error("Error fetching channel emotes:", error);
        } finally {
            setLoading(false);
        }
    };

    return { streamerEmotes, loading, refetch: fetchFollowedStreamersEmotes };
}
