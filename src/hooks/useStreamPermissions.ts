/**
 * Stream Permissions Hook
 * Validates user permissions before allowing streaming operations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    const { toast } = useToast();
    const [permissions, setPermissions] = useState<StreamPermissions>({
        canStream: false,
        canCreateStream: false,
        isBanned: false,
        isSuspended: false,
        hourlyRemaining: 0,
        dailyRemaining: 0,
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
     * Check if user is banned or suspended
     */
    const checkUserStatus = useCallback(async (uid: string): Promise<{
        isBanned: boolean;
        isSuspended: boolean;
        reason?: string;
    }> => {
        // Check if user_roles table exists and has ban/suspend info
        const { data: roleData, error } = await supabase
            .from('user_roles')
            .select('role, metadata')
            .eq('user_id', uid)
            .maybeSingle();

        if (error) {
            console.error('Error checking user status:', error);
            return { isBanned: false, isSuspended: false };
        }

        // Check for banned status
        if (roleData?.metadata?.banned === true) {
            return {
                isBanned: true,
                isSuspended: false,
                reason: roleData.metadata.ban_reason || 'Account banned',
            };
        }

        // Check for suspended status
        if (roleData?.metadata?.suspended === true) {
            const suspendedUntil = roleData.metadata.suspended_until;
            if (suspendedUntil && new Date(suspendedUntil) > new Date()) {
                return {
                    isBanned: false,
                    isSuspended: true,
                    reason: `Account suspended until ${new Date(suspendedUntil).toLocaleDateString()}`,
                };
            }
        }

        return { isBanned: false, isSuspended: false };
    }, []);

    /**
     * Check rate limits from database
     */
    const checkRateLimits = useCallback(async (uid: string): Promise<RateLimitInfo> => {
        try {
            // Call the database function to get rate limit status
            const { data, error } = await supabase
                .rpc('get_stream_rate_limit_status', { p_user_id: uid });

            if (error) {
                console.error('Error checking rate limits:', error);
                // Return conservative defaults on error
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

            return data as RateLimitInfo;
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
            toast({
                variant: 'destructive',
                title: 'Permission Check Failed',
                description: 'Unable to verify streaming permissions. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    }, [checkAuth, checkUserStatus, checkRateLimits, toast]);

    /**
     * Request permission to start stream
     */
    const requestStreamPermission = useCallback(async (): Promise<boolean> => {
        await checkPermissions();

        if (permissions.isBanned) {
            toast({
                variant: 'destructive',
                title: 'Account Banned',
                description: permissions.reason || 'Your account has been banned from streaming.',
            });
            return false;
        }

        if (permissions.isSuspended) {
            toast({
                variant: 'destructive',
                title: 'Account Suspended',
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

            toast({
                variant: 'destructive',
                title: 'Rate Limit Reached',
                description: message,
            });
            return false;
        }

        return true;
    }, [permissions, checkPermissions, toast]);

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
