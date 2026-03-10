import { useState, useEffect } from 'react';
import { useWallet } from '@/providers/WalletProvider';
import { supabase } from '@/integrations/supabase/client';
import { getDecentralizedProfile, saveDecentralizedProfile } from '@/integrations/arweave/profileClient';
import { useChain } from '@/providers/ChainProvider';

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
    is_private: boolean;
    created_at: string;
    updated_at: string;
}

export const useUserProfile = () => {
    const { address, isConnected, network } = useWallet();
    const { chain } = useChain();
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
                // 1. Fetch from Arweave (Primary for Decentralized Mode)
                const arweaveProfile = await getDecentralizedProfile(address);

                // 2. Fetch from Supabase (Secondary)
                let supabaseProfile: UserProfile | null = null;
                try {
                    const { data, error: fetchError } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('wallet_address', address)
                        .maybeSingle();
                    if (!fetchError && data) supabaseProfile = data as UserProfile;
                } catch (e) {
                    console.warn("Supabase profile fetch failed", e);
                }

                if (!isMounted) return;

                // Merge: Arweave data wins for shared fields
                const merged = arweaveProfile || supabaseProfile;
                setProfile(merged);
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

    // Decentralized Persistence Wrapper
    const persistToArweave = async (updates: Partial<UserProfile>) => {
        if (!address) return;
        try {
            await saveDecentralizedProfile(updates, { address, network });
        } catch (e) {
            console.warn("Decentralized profile persistence failed:", e);
        }
    };

    const createProfile = async (roleSelection: {
        isCollector: boolean;
        isCreator: boolean;
        isStreamer: boolean;
    }, displayName?: string) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        const updates = {
            wallet_address: address,
            is_collector: roleSelection.isCollector,
            is_creator: roleSelection.isCreator,
            is_streamer: roleSelection.isStreamer,
            profile_setup_completed: true,
            ...(displayName?.trim() ? { display_name: displayName.trim() } : {}),
        };

        // Persist to Arweave (Always)
        await persistToArweave(updates);

        // Link to Supabase (if available)
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const { data, error: insertError } = await supabase
                .from('user_profiles')
                .upsert({
                    ...updates,
                    user_id: authUser?.id || null,
                }, { onConflict: 'wallet_address' })
                .select()
                .single();

            if (!insertError) {
                setProfile(data as UserProfile);
                return data as UserProfile;
            }
        } catch (e) {
            console.warn("Supabase creation failed, falling back to local state");
        }

        const fallback = { ...profile, ...updates } as UserProfile;
        setProfile(fallback);
        return fallback;
    };

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        // Persist to Arweave
        await persistToArweave({ ...profile, ...updates });

        try {
            const { data, error: updateError } = await supabase
                .from('user_profiles')
                .update(updates as Record<string, unknown>)
                .eq('wallet_address', address)
                .select()
                .single();

            if (!updateError) {
                setProfile(data as UserProfile);
                return data as UserProfile;
            }
        } catch (e) {
            console.warn("Supabase update failed");
        }

        const fallback = { ...profile, ...updates } as UserProfile;
        setProfile(fallback);
        return fallback;
    };

    const saveProfile = async (updates: Partial<UserProfile>) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        // Persist to Arweave
        await persistToArweave({ ...profile, ...updates });

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const upsertData = {
                wallet_address: address,
                user_id: authUser?.id || null,
                ...updates,
                profile_setup_completed: true,
            };

            const { data, error: upsertError } = await (supabase
                .from('user_profiles') as any)
                .upsert(upsertData, { onConflict: 'wallet_address' })
                .select()
                .single();

            if (!upsertError) {
                setProfile(data as UserProfile);
                return data as UserProfile;
            }
        } catch (e) {
            console.warn("Supabase save failed");
        }

        const fallback = { ...profile, ...updates } as UserProfile;
        setProfile(fallback);
        return fallback;
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
