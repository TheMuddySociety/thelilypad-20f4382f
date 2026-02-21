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
    const [loading, setLoading] = useState(false); // FIX #2: Initialize to false
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // FIX #1: Distinguish between disconnected and connecting states
        if (!isConnected) {
            // Wallet is disconnected - stop loading
            setProfile(null);
            setLoading(false);
            return;
        }

        if (!address) {
            // Wallet is connecting or stabilizing - STAY LOADING
            setLoading(true);
            return;
        }

        // FIX #3: Guard profile fetch with cleanup
        let isMounted = true;
        setLoading(true);
        setError(null);

        const fetchProfile = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('wallet_address', address)
                    .maybeSingle();

                if (!isMounted) return;

                if (fetchError) {
                    throw fetchError;
                }

                setProfile(data as UserProfile | null);
            } catch (err: unknown) {
                if (!isMounted) return;
                console.error('Error fetching user profile:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setProfile(null);
            } finally {
                if (isMounted) setLoading(false);
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
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [address, isConnected]);

    const createProfile = async (roleSelection: {
        isCollector: boolean;
        isCreator: boolean;
        isStreamer: boolean;
    }, displayName?: string) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        // Get the current auth user to link profile
        const { data: { user: authUser } } = await supabase.auth.getUser();

        const { data, error: insertError } = await supabase
            .from('user_profiles')
            .upsert({
                wallet_address: address,
                user_id: authUser?.id || null,
                is_collector: roleSelection.isCollector,
                is_creator: roleSelection.isCreator,
                is_streamer: roleSelection.isStreamer,
                profile_setup_completed: true,
                ...(displayName?.trim() ? { display_name: displayName.trim() } : {}),
            }, { onConflict: 'wallet_address' })
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

    // Upsert profile - creates if doesn't exist, updates if exists
    const saveProfile = async (updates: Partial<UserProfile>) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        // Get the current auth user to link profile
        const { data: { user: authUser } } = await supabase.auth.getUser();

        const upsertData = {
            wallet_address: address,
            user_id: authUser?.id || null, // Include user_id for RLS compliance
            ...updates,
            profile_setup_completed: true,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: upsertError } = await (supabase
            .from('user_profiles') as any)
            .upsert(upsertData, {
                onConflict: 'wallet_address'
            })
            .select()
            .single();

        if (upsertError) throw upsertError;

        setProfile(data as UserProfile);
        return data as UserProfile;
    };

    return {
        profile,
        loading,
        error,
        createProfile,
        updateProfile,
        saveProfile,
        hasProfile: !!profile,
        profileComplete: profile?.profile_setup_completed ?? false
    };
};
