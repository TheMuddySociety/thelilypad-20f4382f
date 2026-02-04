// src/admin/adminTypes.ts

/**
 * Admin role levels
 */
export type AdminRole =
    | "admin"       // Standard admin access
    | "superadmin"; // Full system access

/**
 * Admin user record
 */
export interface AdminUser {
    user_id: string;
    role: AdminRole;
    created_at: string;
}

/**
 * Admin action types for audit logging
 */
export type AdminAction =
    | "PROFILE_UPDATE"
    | "PROFILE_SUSPEND"
    | "PROFILE_UNSUSPEND"
    | "ROLE_CHANGE"
    | "STATUS_OVERRIDE"
    | "DELETE_CONTENT"
    | "BAN_USER";

/**
 * Audit log entry
 */
export interface AuditLogEntry {
    id: string;
    admin_id: string;
    target_user_id: string;
    action: AdminAction;
    before: Record<string, any> | null;
    after: Record<string, any> | null;
    reason?: string;
    created_at: string;
}

/**
 * Profile update patch for admin actions
 */
export interface AdminProfilePatch {
    status?: string;
    role?: string;
    metadata?: Record<string, any>;
    is_verified?: boolean;
}
