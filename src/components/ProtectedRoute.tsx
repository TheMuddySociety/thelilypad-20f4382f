import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import FrogLoader from "./FrogLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { status, isAdmin } = useAuth();
  const location = useLocation();

  // Show loader while wallet connecting or profile loading
  if (
    status === "wallet-connecting" ||
    status === "profile-loading"
  ) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <FrogLoader size="lg" />
      </div>
    );
  }

  // Redirect to auth if disconnected
  if (status === "disconnected") {
    return <Navigate to="/auth" replace />;
  }

  // ADMIN BYPASS: If admin, allow through regardless of profile status
  if (isAdmin && location.pathname === '/profile-setup') {
    return <Navigate to="/" replace />;
  }

  // Redirect to profile setup if needed
  if (status === "needs-profile" && location.pathname !== "/profile-setup") {
    return <Navigate to="/profile-setup" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
