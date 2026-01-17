import { useState, useEffect } from 'react';
import { useWallet } from '@/providers/WalletProvider';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
    id: string;
    wallet_address: string;
    user_id: string | null;
    is_collector: boolean;
    is_creator: boolean;
    is_streamer: boolean;
    profile_setup_completed: boolean;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    social_twitter: string | null;
    social_discord: string | null;
    social_instagram: string | null;
    social_youtube: string | null;
    social_tiktok: string | null;
    schedule: unknown;
    categories: string[] | null;
    payout_wallet_address: string | null;
    playlist_ids: string[] | null;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export const useUserProfile = () => {
    const { address, isConnected } = useWallet();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!address || !isConnected) {
            setProfile(null);
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data, error: fetchError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('wallet_address', address)
                    .maybeSingle();

            if (fetchError) {
                    throw fetchError;
                }

                setProfile(data as UserProfile | null);
            } catch (err: unknown) {
                console.error('Error fetching user profile:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();

        // Subscribe to realtime changes
        const channel = supabase
            .channel(`profile-${address}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_profiles',
                    filter: `wallet_address=eq.${address}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        setProfile(payload.new as UserProfile);
                    } else if (payload.eventType === 'DELETE') {
                        setProfile(null);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [address, isConnected]);

    const createProfile = async (roleSelection: {
        isCollector: boolean;
        isCreator: boolean;
        isStreamer: boolean;
    }) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        const { data, error: insertError } = await supabase
            .from('user_profiles')
            .insert({
                wallet_address: address,
                is_collector: roleSelection.isCollector,
                is_creator: roleSelection.isCreator,
                is_streamer: roleSelection.isStreamer,
                profile_setup_completed: true,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        setProfile(data as UserProfile);
        return data as UserProfile;
    };

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        const { data, error: updateError } = await supabase
            .from('user_profiles')
            .update(updates as Record<string, unknown>)
            .eq('wallet_address', address)
            .select()
            .single();

        if (updateError) throw updateError;

        setProfile(data as UserProfile);
        return data as UserProfile;
    };

    return {
        profile,
        loading,
        error,
        createProfile,
        updateProfile,
        hasProfile: !!profile,
        profileComplete: profile?.profile_setup_completed ?? false
    };
};
