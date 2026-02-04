// src/admin/adminActions.ts
import { supabase } from "@/integrations/supabase/client";
import { AdminProfilePatch, AdminAction } from "./adminTypes";

/**
 * Admin RPC: Update user profile with audit logging
 * 
 * This function calls a Supabase RPC that:
 * 1. Logs the action to admin_audit_logs
 * 2. Updates the user profile
 * 3. Is security definer (runs with elevated privileges)
 * 
 * @param targetUserId - The user ID to update
 * @param patch - The changes to apply
 * @param reason - Optional reason for the action
 */
export async function adminUpdateProfile(
    targetUserId: string,
    patch: AdminProfilePatch,
    reason?: string
): Promise<void> {
    const { error } = await supabase.rpc('admin_update_profile', {
        target_user: targetUserId,
        patch: patch as any,
        reason: reason || null
    });

    if (error) {
        throw new Error(`Admin update failed: ${error.message}`);
    }
}

/**
 * Suspend a user profile
 */
export async function suspendProfile(
    targetUserId: string,
    reason: string
): Promise<void> {
    return adminUpdateProfile(
        targetUserId,
        { status: 'SUSPENDED' },
        reason
    );
}

/**
 * Unsuspend a user profile
 */
export async function unsuspendProfile(
    targetUserId: string,
    reason: string
): Promise<void> {
    return adminUpdateProfile(
        targetUserId,
        { status: 'ACTIVE' },
        reason
    );
}

/**
 * Force change user role
 */
export async function changeUserRole(
    targetUserId: string,
    newRole: string,
    reason: string
): Promise<void> {
    return adminUpdateProfile(
        targetUserId,
        { role: newRole },
        reason
    );
}

/**
 * Verify a user account
 */
export async function verifyUser(
    targetUserId: string,
    reason: string
): Promise<void> {
    return adminUpdateProfile(
        targetUserId,
        { is_verified: true },
        reason
    );
}

/**
 * Fetch audit logs for a specific user
 */
export async function fetchUserAuditLogs(targetUserId: string) {
    const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('target_user_id', targetUserId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Fetch recent admin actions (for admin dashboard)
 */
export async function fetchRecentAdminActions(limit: number = 50) {
    const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}
