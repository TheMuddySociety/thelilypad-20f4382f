// src/components/admin/AdminGate.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import FrogLoader from "@/components/FrogLoader";

interface AdminGateProps {
    children: React.ReactNode;
    requireSuperAdmin?: boolean;
}

/**
 * Gate component for admin-only routes
 * Redirects non-admins to home page
 */
export const AdminGate = ({ children, requireSuperAdmin = false }: AdminGateProps) => {
    const { state, isAdmin, profile } = useAuth();

    // Wait for auth to stabilize
    if (state === "CONNECTING_WALLET" || state === "LOADING_PROFILE" || state === "WALLET_CONNECTED") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <FrogLoader size="lg" />
            </div>
        );
    }

    // Not authenticated AND not admin - redirect to auth
    // Admins are allowed through even if in NEEDS_PROFILE state
    if (state === "DISCONNECTED") {
        return <Navigate to="/auth" replace />;
    }

    // Not an admin - redirect to home
    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    // Check for superadmin if required
    if (requireSuperAdmin) {
        // This would check admin_users.role === 'superadmin'
        // For now, all admins can access
        // TODO: Implement role-level checking
    }

    return <>{children}</>;
};
