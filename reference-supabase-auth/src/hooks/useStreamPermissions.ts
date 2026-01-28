/**
 * Stream Permissions Hook
 * Validates user permissions before allowing streaming operations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface StreamPermissions {
    canStream: boolean;
    canCreateStream: boolean;
    isBanned: boolean;
    isSuspended: boolean;
    hourlyRemaining: number;
    dailyRemaining: number;
    reason?: string;
}

export interface RateLimitInfo {
    hourly_count: number;
    hourly_limit: number;
    hourly_remaining: number;
    daily_count: number;
    daily_limit: number;
    daily_remaining: number;
    can_create_stream: boolean;
}

export const useStreamPermissions = () => {
    const [permissions, setPermissions] = useState<StreamPermissions>({
        canStream: false,
        canCreateStream: false,
        isBanned: false,
        isSuspended: false,
        hourlyRemaining: 3,
        dailyRemaining: 10,
    });
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    /**
     * Check if user is authenticated
     */
    const checkAuth = useCallback(async (): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setPermissions({
                canStream: false,
                canCreateStream: false,
                isBanned: false,
                isSuspended: false,
                hourlyRemaining: 0,
                dailyRemaining: 0,
                reason: 'Not authenticated',
            });
            return null;
        }

        setUserId(user.id);
        return user.id;
    }, []);

    /**
     * Check if user is banned using the banned_users table
     */
    const checkUserStatus = useCallback(async (uid: string): Promise<{
        isBanned: boolean;
        isSuspended: boolean;
        reason?: string;
    }> => {
        // Check banned_users table
        const { data: banData, error } = await supabase
            .from('banned_users')
            .select('reason, expires_at')
            .eq('user_id', uid)
            .maybeSingle();

        if (error) {
            console.error('Error checking user status:', error);
            return { isBanned: false, isSuspended: false };
        }

        // Check if user is banned
        if (banData) {
            // Check if ban is permanent (no expiry) or still active
            if (!banData.expires_at || new Date(banData.expires_at) > new Date()) {
                return {
                    isBanned: true,
                    isSuspended: false,
                    reason: banData.reason || 'Account banned',
                };
            }
        }

        return { isBanned: false, isSuspended: false };
    }, []);

    /**
     * Calculate rate limits from recent streams
     */
    const checkRateLimits = useCallback(async (uid: string): Promise<RateLimitInfo> => {
        try {
            const hourlyLimit = 3;
            const dailyLimit = 10;

            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            // Count streams in the last hour
            const { count: hourlyCount } = await supabase
                .from('streams')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', uid)
                .gte('created_at', oneHourAgo);

            // Count streams in the last day
            const { count: dailyCount } = await supabase
                .from('streams')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', uid)
                .gte('created_at', oneDayAgo);

            const hourlyUsed = hourlyCount || 0;
            const dailyUsed = dailyCount || 0;
            const hourlyRemaining = Math.max(0, hourlyLimit - hourlyUsed);
            const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);

            return {
                hourly_count: hourlyUsed,
                hourly_limit: hourlyLimit,
                hourly_remaining: hourlyRemaining,
                daily_count: dailyUsed,
                daily_limit: dailyLimit,
                daily_remaining: dailyRemaining,
                can_create_stream: hourlyRemaining > 0 && dailyRemaining > 0,
            };
        } catch (error) {
            console.error('Exception checking rate limits:', error);
            return {
                hourly_count: 0,
                hourly_limit: 3,
                hourly_remaining: 3,
                daily_count: 0,
                daily_limit: 10,
                daily_remaining: 10,
                can_create_stream: true,
            };
        }
    }, []);

    /**
     * Check all permissions
     */
    const checkPermissions = useCallback(async () => {
        setLoading(true);

        try {
            // 1. Check authentication
            const uid = await checkAuth();
            if (!uid) {
                setLoading(false);
                return;
            }

            // 2. Check user status (banned/suspended)
            const statusCheck = await checkUserStatus(uid);
            if (statusCheck.isBanned || statusCheck.isSuspended) {
                setPermissions({
                    canStream: false,
                    canCreateStream: false,
                    isBanned: statusCheck.isBanned,
                    isSuspended: statusCheck.isSuspended,
                    hourlyRemaining: 0,
                    dailyRemaining: 0,
                    reason: statusCheck.reason,
                });
                setLoading(false);
                return;
            }

            // 3. Check rate limits
            const rateLimits = await checkRateLimits(uid);

            // 4. Set final permissions
            setPermissions({
                canStream: true,
                canCreateStream: rateLimits.can_create_stream,
                isBanned: false,
                isSuspended: false,
                hourlyRemaining: rateLimits.hourly_remaining,
                dailyRemaining: rateLimits.daily_remaining,
            });
        } catch (error) {
            console.error('Error checking permissions:', error);
            toast.error('Permission Check Failed', {
                description: 'Unable to verify streaming permissions. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    }, [checkAuth, checkUserStatus, checkRateLimits]);

    /**
     * Request permission to start stream
     */
    const requestStreamPermission = useCallback(async (): Promise<boolean> => {
        await checkPermissions();

        if (permissions.isBanned) {
            toast.error('Account Banned', {
                description: permissions.reason || 'Your account has been banned from streaming.',
            });
            return false;
        }

        if (permissions.isSuspended) {
            toast.error('Account Suspended', {
                description: permissions.reason || 'Your account is temporarily suspended.',
            });
            return false;
        }

        if (!permissions.canCreateStream) {
            let message = 'You have reached your streaming limit.';

            if (permissions.hourlyRemaining === 0) {
                message = 'You have reached your hourly streaming limit (3 streams/hour). Please wait before creating another stream.';
            } else if (permissions.dailyRemaining === 0) {
                message = 'You have reached your daily streaming limit (10 streams/day). Please try again tomorrow.';
            }

            toast.error('Rate Limit Reached', {
                description: message,
            });
            return false;
        }

        return true;
    }, [permissions, checkPermissions]);

    /**
     * Initialize on mount
     */
    useEffect(() => {
        checkPermissions();
    }, [checkPermissions]);

    /**
     * Subscribe to auth changes
     */
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            checkPermissions();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [checkPermissions]);

    return {
        permissions,
        loading,
        userId,
        checkPermissions,
        requestStreamPermission,
    };
};
