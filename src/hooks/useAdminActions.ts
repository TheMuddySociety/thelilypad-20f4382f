// src/hooks/useAdminActions.ts
import { useState } from "react";
import { toast } from "sonner";
import {
    adminUpdateProfile,
    suspendProfile,
    unsuspendProfile,
    changeUserRole,
    verifyUser,
    fetchUserAuditLogs,
    fetchRecentAdminActions
} from "@/admin/adminActions";
import { AdminProfilePatch } from "@/admin/adminTypes";

/**
 * Hook for admin moderation actions
 * Provides wrapped functions with loading states and error handling
 */
export function useAdminActions() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const executeAction = async <T,>(
        action: () => Promise<T>,
        successMessage: string
    ): Promise<T | null> => {
        setLoading(true);
        setError(null);

        try {
            const result = await action();
            toast.success(successMessage);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Action failed";
            setError(message);
            toast.error(message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,

        // Profile updates
        updateProfile: (userId: string, patch: AdminProfilePatch, reason?: string) =>
            executeAction(
                () => adminUpdateProfile(userId, patch, reason),
                "Profile updated successfully"
            ),

        // Suspension
        suspend: (userId: string, reason: string) =>
            executeAction(
                () => suspendProfile(userId, reason),
                "User suspended"
            ),

        unsuspend: (userId: string, reason: string) =>
            executeAction(
                () => unsuspendProfile(userId, reason),
                "User unsuspended"
            ),

        // Role management
        changeRole: (userId: string, role: string, reason: string) =>
            executeAction(
                () => changeUserRole(userId, role, reason),
                "Role changed successfully"
            ),

        // Verification
        verify: (userId: string, reason: string) =>
            executeAction(
                () => verifyUser(userId, reason),
                "User verified"
            ),

        // Audit logs
        getAuditLogs: (userId: string) =>
            executeAction(
                () => fetchUserAuditLogs(userId),
                "Audit logs fetched"
            ),

        getRecentActions: (limit?: number) =>
            executeAction(
                () => fetchRecentAdminActions(limit),
                "Recent actions fetched"
            )
    };
}
