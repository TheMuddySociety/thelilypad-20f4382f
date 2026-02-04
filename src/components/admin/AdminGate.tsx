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
    if (state === "CONNECTING_WALLET" || state === "LOADING_PROFILE") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <FrogLoader size="lg" />
            </div>
        );
    }

    // Not authenticated - redirect to auth
    if (state !== "AUTHENTICATED") {
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
