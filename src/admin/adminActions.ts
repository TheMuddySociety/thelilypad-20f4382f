// src/admin/adminActions.ts
import { AdminProfilePatch, AdminAction, AuditLogEntry } from "./adminTypes";

/**
 * Admin RPC: Update user profile with audit logging
 * 
 * Note: This is stubbed until admin_audit_logs table and admin_update_profile RPC are created
 */
export async function adminUpdateProfile(
    targetUserId: string,
    patch: AdminProfilePatch,
    reason?: string
): Promise<void> {
    console.warn('Admin actions not yet configured - admin_update_profile RPC needed');
    // TODO: Implement when admin_audit_logs table exists
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
 * Stubbed until admin_audit_logs table exists
 */
export async function fetchUserAuditLogs(targetUserId: string): Promise<AuditLogEntry[]> {
    console.warn('Admin audit logs not yet configured');
    return [];
}

/**
 * Fetch recent admin actions (for admin dashboard)
 * Stubbed until admin_audit_logs table exists
 */
export async function fetchRecentAdminActions(limit: number = 50): Promise<AuditLogEntry[]> {
    console.warn('Admin audit logs not yet configured');
    return [];
}
