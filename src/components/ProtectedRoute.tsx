import { Navigate, useLocation } from "react-router-dom";
import { useWallet } from "@/providers/WalletProvider";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import FrogLoader from "./FrogLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isConnected, isConnecting } = useWallet();
  const { profile, loading: profileLoading } = useUserProfile();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const location = useLocation();

  // Show loader while checking connection status or loading profile
  if (isConnecting || (isConnected && (profileLoading || adminLoading))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FrogLoader size="lg" />
      </div>
    );
  }

  // Redirect to auth if not connected
  if (!isConnected) {
    return <Navigate to="/auth" replace />;
  }

  // ADMIN BYPASS: If admin, allow through regardless of profile status
  if (isAdmin) {
    // If admin is on profile-setup, maybe redirect to home?
    if (location.pathname === '/profile-setup') {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  // If connected but profile not setup and not already on profile-setup page, redirect
  if (isConnected && !profileLoading) {
    // Check if profile setup is incomplete
    const needsProfileSetup = !profile || !profile.profile_setup_completed;

    // Don't redirect if already on profile-setup page
    if (needsProfileSetup && location.pathname !== '/profile-setup') {
      return <Navigate to="/profile-setup" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
